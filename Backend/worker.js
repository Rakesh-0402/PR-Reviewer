import "dotenv/config";
import mongoose from "mongoose";
import { Worker, DelayedError } from "bullmq";
import connectDB from "./config/db.js";
import ReviewJob from "./models/ReviewJob.js";
import Review from "./models/Review.js";
import { QUEUE_NAME, reviewQueue, queueConnection, redisConnection, enqueueReview } from "./config/reviewQueue.js";
import { processTick, TERMINAL, stopRemaining } from "./services/reviewJobCore.js";
import { prepareReviewJob } from "./services/prepareReviewJob.js";
import { reviewBatch } from "./services/groqService.js";
import { finishReviewJob } from "./services/finishReviewJob.js";
import AutomaticReview from "./models/AutomaticReview.js";
import {
  processAutomaticReview,
  reconcileAutomaticReviews,
} from "./services/automaticReviewWorker.js";
import { initAiBudgets } from "./services/aiBudgetService.js";
await connectDB();
await initAiBudgets();
await Promise.all([ReviewJob.init(), Review.init(), AutomaticReview.init()]);
await reviewQueue.setGlobalConcurrency(1);
const workerConnection = redisConnection(true);
const COOLDOWN_KEY = `${QUEUE_NAME}:groq-cooldown`;

async function delayJob(job, token, timestamp) {
  await job.moveToDelayed(timestamp, token);
  throw new DelayedError();
}

const worker = new Worker(QUEUE_NAME, async (queueJob, token) => {
  //automatic pr review
    if (queueJob.name === "automatic-review") {
    return processAutomaticReview(queueJob, token);
  }
  //manual pr review
  const document = await ReviewJob.findById(queueJob.data.reviewJobId);
  if (!document || !document.activeUser) return;
  const now = Date.now();
  const cooldown = Number(await queueConnection.get(COOLDOWN_KEY)) || 0;
  const due = Math.max(new Date(document.nextRunAt || 0).getTime(), cooldown);
  if (due > now && now < document.expiresAt.getTime()) {
    await ReviewJob.updateOne({ _id: document._id }, { $set: {
      status: "waiting", "state.status": "waiting",
      "state.message": "Waiting for scheduled API retry", nextRunAt: new Date(due),
    } });
    return delayJob(queueJob, token, Math.min(due, document.expiresAt.getTime()));
  }
  await ReviewJob.updateOne({ _id: document._id }, { $set: {
    status: "running", "state.message": document.state.prepared ? "Analyzing the next batch" : "Fetching changed files",
  } });
 const outcome = await processTick(document.state, {
  now,
  expiresAt: document.expiresAt.getTime(),
  prepare: () => prepareReviewJob(document),
  reviewBatch: files =>
    reviewBatch(files, {
      type: "user",
      id: String(document.userId),
    }),
});
  if (TERMINAL.has(outcome.state.status)) {
    await finishReviewJob(document._id, outcome.state);
    return;
  }
  const nextRunAt = Date.now() + outcome.delay;
  // Commit batch checkpoint BEFORE delaying the queue job.
  await ReviewJob.updateOne({ _id: document._id }, { $set: {
    state: outcome.state, status: outcome.state.status, nextRunAt: new Date(nextRunAt),
  } });
  if (outcome.cooldown) {
    // This queue's global concurrency is one, so provider cooldown applies to all users here.
    await queueConnection.set(COOLDOWN_KEY, String(nextRunAt), "PX", outcome.delay);
  }
  return delayJob(queueJob, token, nextRunAt);
}, { connection: workerConnection, concurrency: 1, lockDuration: 120_000, maxStalledCount: 2 });

worker.on("error", error => console.error("Review worker infrastructure error:", error.name));
worker.on("failed", (job, error) => console.error("Queue processing attempt failed:", { jobId: job?.id, type: error.name }));

let reconciling = false;
async function reconcile() {
  if (reconciling) return;
  reconciling = true;
  try {
    await reconcileAutomaticReviews();
    // Recreate absent queue entries from MongoDB after an enqueue failure or Redis data loss.
    for await (const document of ReviewJob.find({ activeUser: { $exists: true } }).cursor()) {
      let queued = await reviewQueue.getJob(String(document._id));
      const status = queued ? await queued.getState() : "unknown";
      if (status === "failed") {
        await finishReviewJob(document._id, stopRemaining(structuredClone(document.state), "Worker infrastructure retries exhausted. Please start a new review."));
      } else if (status === "completed") {
        await queued.remove();
        await enqueueReview(document);
      } else if (!queued || status === "unknown") {
        await enqueueReview(document);
      }
    }
  } catch (error) {
    console.error("Queue reconciliation will retry:", error.name);
  } finally { reconciling = false; }
}
await reconcile();
const timer = setInterval(reconcile, 15_000);
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);
  await worker.close();
  await reviewQueue.close();
  await Promise.all([workerConnection.quit(), queueConnection.quit()]);
  await mongoose.disconnect();
}
process.on("SIGTERM", () => shutdown().catch(() => process.exit(1)));
process.on("SIGINT", () => shutdown().catch(() => process.exit(1)));
console.log("Review worker ready");
