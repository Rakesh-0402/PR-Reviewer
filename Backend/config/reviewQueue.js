import "dotenv/config";
import IORedis from "ioredis";
import { Queue } from "bullmq";

export const QUEUE_NAME = "pr-reviews-v1";
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required.");

export function redisConnection(worker = false) {
  const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: worker ? null : 1,
    enableOfflineQueue: worker,
    connectTimeout: 10_000,
  });
  connection.on("error", (error) => {
     console.error("Redis connection failed.", {
      code: error.code,
      message : error.message,
     });
  });
  return connection;
}

export const queueConnection = redisConnection();
export const reviewQueue = new Queue(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: false,
  },
});
//queue error handler
reviewQueue.on("error", (error) => {
  console.error("Review queue failed.", {
    code: error.code,
    message : error.message,
    });
  });

export async function enqueueReview(document) {
  return reviewQueue.add("review", { reviewJobId: String(document._id) }, {
    jobId: String(document._id),
    delay: Math.max(0, new Date(document.nextRunAt || 0).getTime() - Date.now()),
  });
}
