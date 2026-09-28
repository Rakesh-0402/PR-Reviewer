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
      for (const file of batch.files) state.skipped.push({ filename: file.filename, reason });
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
    state.status = !count ? "failed" : state.skipped.length || !state.metadata.fetchComplete ? "partial" : "completed";
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
    const headers = error.headers ?? error.response?.headers;
    console.error("AI batch request failed:", {
    batch: state.batches.indexOf(batch) + 1,
    attempt: batch.attempts + 1,
    status: error.status ?? error.response?.status,
    message: error.message,
    retryAfter:
      typeof headers?.get === "function"
        ? headers.get("retry-after")
        : headers?.["retry-after"],
  });
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
    for (const file of batch.files) state.skipped.push({ filename: file.filename, reason });
    state.status = "queued";
    state.message = reason;
    return { state, delay: status === 429 ? 60_000 : 1000, cooldown: status === 429 };
  }
}

export function publicProgress(document) {
  const state = document.state;
  const completed = state.batches.filter(b => b.status === "completed");
  return {
    jobId: String(document._id), owner: document.owner, repo: document.repo,
    prNumber: document.prNumber, title: state.metadata?.title || "",
    status: document.status, message: state.message,
    totalFiles: state.metadata?.totalFiles ?? null,
    reviewedFiles: completed.reduce((n, b) => n + b.files.length, 0),
    completedBatches: completed.length, totalBatches: state.batches.length,
    skippedFiles: state.skipped.length, nextRunAt: document.nextRunAt,
    createdAt: document.createdAt, updatedAt: document.updatedAt,
  };
}

export function combineReview(state) {
  const batches = state.batches.filter(b => b.status === "completed");
  if (!batches.length) return null;
  const results = batches.map(b => b.result);
  const reviewedFiles = batches.flatMap(b => b.files.map(f => f.filename));
  const coverageText = `Reviewed ${reviewedFiles.length} of ${state.metadata.totalFiles} changed files. ${state.status === "completed" ? "All supplied patches included." : "Partial review."}`;
  const seen = new Set();
  const priorityIssues = results.flatMap(r => r.priorityIssues).filter(issue => {
    const key = `${issue.filename}:${issue.title.trim().toLowerCase()}`;
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
    coverage: { ...state.metadata, status: state.status === "completed" ? "complete" : "partial", reviewedFiles, reviewedCount: reviewedFiles.length, skipped: state.skipped, successfulBatches: batches.length },
    markdown: [
      "## Review coverage", coverageText,
      "Scope: GitHub-provided patches only. No tests were run. Independent batches can miss cross-file interactions.",
      results.length > 1 ? "The displayed score is the lowest batch score; category counts sum batch estimates." : "",
      state.skipped.length ? "### Files not reviewed\n" + state.skipped.map(f => `- ${JSON.stringify(f.filename)}: ${f.reason}`).join("\n") : "",
      ...batches.map((b, i) => `## Batch ${i + 1}\n\n${b.result.markdown}`),
    ].filter(Boolean).join("\n\n"),
  } };
}
