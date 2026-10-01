import { getCoverage } from "./reviewCoverage.js";
import { skipPiece } from "./patchSplitter.js";
// Pure workflow logic: no database, Redis, or API credentials required to test.
export const TERMINAL = new Set(["completed", "partial", "failed"]);

export function retryDelay(error, attempt, now = Date.now()) {
  const headers = error.headers ?? error.response?.headers;
  const raw = typeof headers?.get === "function"
    ? headers.get("retry-after") : headers?.["retry-after"];
  if (raw != null && String(raw).trim() !== "") {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000 + 1000;
    const date = Date.parse(String(raw));
    if (Number.isFinite(date)) return Math.max(0, date - now) + 1000;
  }
  return Math.min(60_000 * 2 ** Math.min(attempt - 1, 6), 3_600_000);
}

export function initialState() {
  return { prepared: false, batches: [], skipped: [], metadata: null,
    status: "queued", message: "Queued for review", prepareAttempts: 0 };
}

export function stopRemaining(state, reason) {
  for (const batch of state.batches) {
    if (batch.status !== "completed" && batch.status !== "skipped") {
      batch.status = "skipped";
      for (const file of batch.files) state.skipped.push(skipPiece(file, reason));
    }
  }
  state.status = state.batches.some(b => b.status === "completed") ? "partial" : "failed";
  state.message = reason;
  return state;
}

export async function processTick(input, deps) {
  const state = structuredClone(input);
  const now = deps.now ?? Date.now();
  if (TERMINAL.has(state.status)) return { state };
  if (now >= deps.expiresAt) return { state: stopRemaining(state, "Review exceeded its 24-hour processing window.") };

  if (!state.prepared) {
    try {
      const prepared = await deps.prepare();
      state.metadata = prepared.metadata;
      state.fileManifest = prepared.fileManifest || [];
      state.planVersion = prepared.planVersion || 1;
      state.skipped = prepared.skipped;
      state.batches = prepared.batches.map(files => ({ files, status: "pending", attempts: 0, result: null }));
      state.prepared = true;
      if (!state.batches.length) return { state: stopRemaining(state, "No reviewable file patches fit the configured limits.") };
      state.status = "queued";
      state.message = "Files fetched; queued for analysis";
      return { state, delay: 100 };
    } catch (error) {
      state.prepareAttempts++;
      const status = error.response?.status ?? error.status;
      const retryable = !error.permanent && (!status || status === 429 || status >= 500);
      if (retryable && state.prepareAttempts < 4) {
        state.status = "waiting";
        state.message = "Waiting to retry GitHub file retrieval";
        return { state, delay: retryDelay(error, state.prepareAttempts, now) };
      }
      return { state: stopRemaining(state, error.publicMessage || "Could not fetch PR files. Check repository access and server configuration.") };
    }
  }

  const batch = state.batches.find(b => b.status === "pending");
  if (!batch) {
    const count = state.batches.filter(b => b.status === "completed").length;
    const coverage = getCoverage(state);
    state.status = !count ? "failed" : coverage.reviewedFiles.length === state.metadata.totalFiles && state.metadata.fetchComplete ? "completed" : "partial";
    state.message = count ? "Review finished" : "No batches could be reviewed";
    return { state };
  }

  try {
    // This calls the one-request function, never the old sleeping retry loop.
    batch.result = await deps.reviewBatch(batch.files);
    batch.status = "completed";
    batch.attempts = 0;
    state.status = "queued";
    state.message = "Batch saved; continuing review";
    return { state, delay: 1000 };
  } catch (error) {
    if (
  error.code === "AI_BUDGET_WAIT" ||
  error.code === "AI_BUDGET_UNAVAILABLE"
) {
  const currentTime = deps.now ?? Date.now();

  if (currentTime >= deps.expiresAt) {
    return {
      state: stopRemaining(
        state,
        "Review processing window expired while waiting for budget."
      ),
    };
  }

  const requestedRetry = Number.isFinite(error.retryAt)
    ? error.retryAt
    : currentTime + 60_000;

  const nextAttempt = Math.min(
    Math.max(currentTime + 1000, requestedRetry),
    deps.expiresAt
  );

  state.status = "waiting";
  state.message = error.message;

  return {
    state,
    delay: Math.max(1, nextAttempt - currentTime),
    cooldown: false,
  };
}

if (error.code === "AI_BUDGET_CONFIG") {
  return {
    state: stopRemaining(state, error.message),
  };
}
    batch.attempts++;
    const status = error.status ?? error.response?.status;
    if (status === 401 || status === 403) {
      return { state: stopRemaining(state, "AI authentication or access failed. Contact the app owner.") };
    }
    // Bounded retries remain necessary even for background work.
    if (status === 429 && batch.attempts <= 12) {
      const delay = retryDelay(error, batch.attempts, now);
      if (now + delay >= deps.expiresAt) {
        return { state: stopRemaining(state, "API cooldown exceeds this review's processing window.") };
      }
      state.status = "waiting";
      state.message = "Waiting for AI API capacity; retry scheduled";
      return { state, delay, cooldown: true };
    }
    if (status !== 429 && status !== 400 && batch.attempts < 3) {
      state.status = "waiting";
      state.message = "Retrying a failed or invalid AI response";
      return { state, delay: 10_000 * batch.attempts };
    }
    const reason = status === 429 ? "Rate-limit retry allowance exhausted." : "AI batch failed after processing attempts.";
    batch.status = "skipped";
    for (const file of batch.files) state.skipped.push(skipPiece(file, reason));
    state.status = "queued";
    state.message = reason;
    return { state, delay: status === 429 ? 60_000 : 1000, cooldown: status === 429 };
  }
}

export function publicProgress(document) {
  const state = document.state;
  const completed = state.batches.filter(b => b.status === "completed");
  const coverage = getCoverage(state);
  return {
    jobId: String(document._id), owner: document.owner, repo: document.repo,
    prNumber: document.prNumber, title: state.metadata?.title || "",
    status: document.status, message: state.message,
    totalFiles: state.metadata?.totalFiles ?? null,
    reviewedFiles: coverage.reviewedFiles.length,
    partialFiles: coverage.partialFiles.length,
    completedParts: coverage.completedParts, totalParts: coverage.totalParts,
    completedBatches: completed.length, totalBatches: state.batches.length,
    skippedFiles: coverage.skippedFiles.length, nextRunAt: document.nextRunAt,
    createdAt: document.createdAt, updatedAt: document.updatedAt,
  };
}

export function combineReview(state) {
  const batches = state.batches.map((b, index) => ({ ...b, index })).filter(b => b.status === "completed");
  if (!batches.length) return null;
  const results = batches.map(b => b.result);
  const coverage = getCoverage(state);
  const reviewedFiles = coverage.reviewedFiles;
  const coverageText = `Fully reviewed ${reviewedFiles.length} of ${state.metadata.totalFiles} changed files; ${coverage.partialFiles.length} partially reviewed. ${coverage.completedParts}/${coverage.totalParts} supplied patch parts reviewed.`;
  const seen = new Set();
  const priorityIssues = results.flatMap(r => r.priorityIssues).filter(issue => {
    // Conservative exact duplicate removal; different descriptions are preserved.
    const key = JSON.stringify([issue.filename, issue.chunkId || null, issue.title.trim().toLowerCase(), issue.description.trim().toLowerCase()]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.severity] - { High: 0, Medium: 1, Low: 2 }[b.severity]));
  const sum = key => results.reduce((n, r) => n + r[key], 0);
  return { review: {
    overallScore: Math.min(...results.map(r => r.overallScore)),
    summary: `${coverageText} ${results.map(r => r.summary).join(" ")}`,
    bugs: sum("bugs"), performance: sum("performance"), security: sum("security"), bestPractices: sum("bestPractices"),
    estimatedFixTime: results.length === 1 ? results[0].estimatedFixTime : "See batch estimates",
    priorityIssues: priorityIssues.slice(0, 3),
    coverage: { ...state.metadata, status: state.status === "completed" ? "complete" : "partial",
      reviewedFiles, reviewedCount: reviewedFiles.length, partialFiles: coverage.partialFiles,
      fileCoverage: coverage.files, completedParts: coverage.completedParts, totalParts: coverage.totalParts,
      skipped: state.skipped, successfulBatches: batches.length },
    markdown: [
      "## Review coverage", coverageText,
      "Scope: GitHub-provided patches only. No tests were run. Separate file fragments can miss interactions and lack surrounding code. Full coverage means every supplied part was processed, not that every defect was found.",
      results.length > 1 ? "The displayed score is the lowest batch score; category counts sum batch estimates and may contain overlapping findings." : "",
      coverage.files.some(f => f.status !== "reviewed") ? "### Incomplete file coverage\n" + coverage.files.filter(f => f.status !== "reviewed").map(f => `- ${JSON.stringify(f.filename)}: ${f.completedParts}/${f.totalParts} parts reviewed. ${f.reasons.join(" ")}`).join("\n") : "",
      ...batches.map(b => `## Batch ${b.index + 1}\n\n` + b.files.map(f => `- ${JSON.stringify(f.filename)} — part ${f.partIndex || 1}/${f.partCount || 1}`).join("\n") + `\n\n${b.result.markdown}`),
    ].filter(Boolean).join("\n\n"),
  } };
}
