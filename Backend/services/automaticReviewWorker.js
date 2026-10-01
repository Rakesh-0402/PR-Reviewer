import { DelayedError } from "bullmq";
import AutomaticReview from "../models/AutomaticReview.js";
import {
  QUEUE_NAME,
  reviewQueue,
  queueConnection,
} from "../config/reviewQueue.js";
import {
  processTick,
  TERMINAL,
  combineReview,
  retryDelay,
} from "./reviewJobCore.js";
import { compactState } from "./reviewCoverage.js";
import { prepareReviewJob } from "./prepareReviewJob.js";
import { reviewBatch } from "./groqService.js";
import {
  installationToken,
  repositoryPath,
  githubRequest,
} from "./githubAppService.js";

const ACTIVE_STAGES = ["review", "publish"];
const COOLDOWN_KEY = `${QUEUE_NAME}:groq-cooldown`;

async function delay(queueJob, lockToken, timestamp) {
  await queueJob.moveToDelayed(timestamp, lockToken);
  throw new DelayedError();
}

async function supersede(document, message) {
  await AutomaticReview.updateOne(
    { _id: document._id, stage: { $in: ACTIVE_STAGES } },
    {
      $set: {
        stage: "superseded",
        lastError: message,
      },
    }
  );
}

async function currentVersion(document, token) {
  const { data: pr } = await githubRequest(
    token,
    "GET",
    `${repositoryPath(document)}/pulls/${document.prNumber}`
  );

  return (
    pr.state === "open" &&
    !pr.draft &&
    pr.head.sha === document.headSha &&
    pr.base.sha === document.baseSha
  );
}

// Render model-generated text as text rather than arbitrary Markdown.
// Also avoid accidental GitHub @mentions.
function text(value, max = 1500) {
  return String(value ?? "")
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@/g, "@\u200b")
    .replace(/([\\`*_{}\[\]()#+.!|~-])/g, "\\$1");
}

function commentBody(document) {
  const marker = "<!-- ai-pr-reviewer:automatic-summary:v1 -->";
  const review = document.result?.review;

  const header = [
    marker,
    "## AI PR Reviewer",
    `Commit: \`${document.headSha}\``,
    `Result: **${document.state.status}**`,
  ];

  if (!review) {
    return [
      ...header,
      text(document.state.message),
      "",
      "No completed AI review is available.",
    ].join("\n\n");
  }

  const coverage = review.coverage || {};

  const findings = (review.priorityIssues || []).map(issue => [
    `### ${text(issue.severity, 20)}: ${text(issue.title, 180)}`,
    `File: ${text(issue.filename, 300)}`,
    text(issue.description, 1800),
  ].join("\n\n"));

  return [
    ...header,
    `Fully reviewed **${coverage.reviewedCount ?? 0}/${coverage.totalFiles ?? "?"} files**.`,
    `Patch parts processed: **${coverage.completedParts ?? 0}/${coverage.totalParts ?? "?"}**.`,
    text(review.summary, 1800),
    ...findings,
    findings.length ? "" : "No priority findings were reported in the reviewed patches.",
    "AI-generated feedback. Review coverage may be partial; no tests were run. A human should verify findings before merging.",
  ].filter(Boolean).join("\n\n");
}

async function publish(document, token) {
  const path = repositoryPath(document);
  const marker = "<!-- ai-pr-reviewer:automatic-summary:v1 -->";
  let existing = null;

  // Search for our App's existing summary, including after an uncertain POST.
  // Stop rather than risk creating duplicates if this safety bound is exceeded.
  for (let page = 1; page <= 20; page++) {
    const response = await githubRequest(
      token,
      "GET",
      `${path}/issues/${document.prNumber}/comments`,
      undefined,
      { per_page: 100, page }
    );

    existing = response.data.find(comment =>
      String(comment.performed_via_github_app?.id) ===
        String(process.env.GITHUB_APP_ID) &&
      comment.body?.includes(marker)
    );

    if (existing) break;

    const more = /rel="next"/.test(response.headers.link || "");
    if (!more) break;

    if (page === 20) {
      throw new Error("Comment search safety limit reached.");
    }
  }

  // Recheck immediately before publication.
  if (!await currentVersion(document, token)) {
    await supersede(document, "PR changed or closed before publication.");
    return;
  }

  const stillActive = await AutomaticReview.exists({
    _id: document._id,
    stage: "publish",
  });

  if (!stillActive) return;

  const body = commentBody(document);

  // If a retry finds exactly the saved output, no write is needed.
  const response = existing?.body === body
    ? { data: existing }
    : await githubRequest(
        token,
        existing ? "PATCH" : "POST",
        existing
          ? `${path}/issues/comments/${existing.id}`
          : `${path}/issues/${document.prNumber}/comments`,
        { body }
      );

  await AutomaticReview.updateOne(
    { _id: document._id, stage: "publish" },
    {
      $set: {
        stage: "done",
        nextRunAt: null,
        commentId: response.data.id,
        commentUrl: response.data.html_url,
        lastError: "",
      },
    }
  );

  console.log("Automatic review published:", {
    repository: `${document.owner}/${document.repo}`,
    pr: document.prNumber,
    commentUrl: response.data.html_url,
  });
}

export async function processAutomaticReview(queueJob, lockToken) {
  const document = await AutomaticReview.findById(
    queueJob.data.automaticReviewId
  );

  if (!document || !ACTIVE_STAGES.includes(document.stage)) return;

  const now = Date.now();
  const expiry = document.stage === "publish"
    ? document.publishExpiresAt?.getTime()
    : document.expiresAt.getTime();

  if (document.stage === "publish" && now >= expiry) {
    await AutomaticReview.updateOne(
      { _id: document._id, stage: "publish" },
      {
        $set: {
          stage: "failed",
          lastError: "Review saved, but GitHub publication timed out.",
        },
      }
    );
    return;
  }

  const cooldown = document.stage === "review"
    ? Number(await queueConnection.get(COOLDOWN_KEY)) || 0
    : 0;

  const due = Math.max(
    document.nextRunAt?.getTime() || 0,
    cooldown
  );

  if (due > now && now < expiry) {
    return delay(queueJob, lockToken, Math.min(due, expiry));
  }

  try {
    // Renew installation access for every tick; never persist the token.
    const token = await installationToken(
      document.installationId,
      document.repositoryId
    );

    if (!await currentVersion(document, token)) {
      await supersede(document, "PR changed, became a draft, or was closed.");
      return;
    }

    if (document.stage === "publish") {
      await publish(document, token);
      return;
    }

    const outcome = await processTick(document.state, {
      now: Date.now(),
      expiresAt: document.expiresAt.getTime(),
      prepare: () => prepareReviewJob(document, token),
      reviewBatch: files =>
        reviewBatch(files, {
          type: "installation",
          id: String(document.installationId),
        }),
    });

    const terminal = TERMINAL.has(outcome.state.status);
    const nextRunAt = Date.now() + (terminal ? 100 : outcome.delay);

    const update = terminal
      ? {
          stage: "publish",
          state: compactState(outcome.state),
          result: combineReview(outcome.state),
          publishExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          nextRunAt: new Date(nextRunAt),
          infrastructureAttempts: 0,
        }
      : {
          state: outcome.state,
          nextRunAt: new Date(nextRunAt),
          infrastructureAttempts: 0,
        };

    const saved = await AutomaticReview.updateOne(
      { _id: document._id, stage: "review" },
      { $set: update }
    );

    if (!saved.matchedCount) return;

    if (outcome.cooldown) {
      await queueConnection.set(
        COOLDOWN_KEY,
        String(nextRunAt),
        "PX",
        outcome.delay
      );
    }

    console.log("Automatic review progress:", {
      repository: `${document.owner}/${document.repo}`,
      pr: document.prNumber,
      status: outcome.state.status,
      message: outcome.state.message,
    });

    return delay(queueJob, lockToken, nextRunAt);
  } catch (error) {
    if (error instanceof DelayedError) throw error;

    const status = error.response?.status ?? error.status;
    const attempt = document.infrastructureAttempts + 1;
    const stageExpiry = document.stage === "publish"
      ? document.publishExpiresAt.getTime()
      : document.expiresAt.getTime();

    console.error("Automatic review infrastructure failure:", {
      jobId: String(document._id),
      stage: document.stage,
      status,
      type: error.name,
      message:error.message,
    });

    // Lost permission, missing installation/repository, or bounded retry failure.
    if (
      [401, 404, 422].includes(status) ||
      attempt >= 6 ||
      Date.now() >= stageExpiry
    ) {
      await AutomaticReview.updateOne(
        { _id: document._id, stage: document.stage },
        {
          $set: {
            stage: "failed",
            lastError: document.stage === "publish"
              ? "Review saved, but GitHub publication failed."
              : "GitHub access or worker processing failed.",
          },
        }
      );
      return;
    }

    const wait = retryDelay(error, attempt);
    const nextRunAt = Math.min(Date.now() + wait, stageExpiry);

    const saved = await AutomaticReview.updateOne(
      { _id: document._id, stage: document.stage },
      {
        $set: {
          infrastructureAttempts: attempt,
          nextRunAt: new Date(nextRunAt),
          lastError: `Infrastructure retry scheduled (${status || error.name}).`,
        },
      }
    );

    if (!saved.matchedCount) return;

    return delay(queueJob, lockToken, nextRunAt);
  }
}

export async function reconcileAutomaticReviews() {
  for await (
    const document of AutomaticReview.find({
      stage: { $in: ACTIVE_STAGES },
    }).cursor()
  ) {
    const jobId = `auto-${document._id}`;
    const queued = await reviewQueue.getJob(jobId);
    const state = queued ? await queued.getState() : null;

    if (state === "failed") {
      await AutomaticReview.updateOne(
        { _id: document._id, stage: { $in: ACTIVE_STAGES } },
        {
          $set: {
            stage: "failed",
            lastError: "Queue infrastructure retries exhausted.",
          },
        }
      );
      continue;
    }

    if (state === "completed") {
      await queued.remove();
    } else if (queued) {
      continue;
    }

    await reviewQueue.add(
      "automatic-review",
      { automaticReviewId: String(document._id) },
      {
        jobId,
        delay: Math.max(
          0,
          new Date(document.nextRunAt || 0).getTime() - Date.now()
        ),
      }
    );
  }
}