import test from "node:test";
import assert from "node:assert/strict";
import { initialState, processTick, retryDelay, publicProgress, combineReview } from "../services/reviewJobCore.js";

const result = { overallScore: 8, summary: "Checked changes", bugs: 0, performance: 0, security: 0, bestPractices: 0, estimatedFixTime: "0 mins", priorityIssues: [], markdown: "No findings" };
const file = name => ({ filename: name, patch: "+ code" });
const metadata = { totalFiles: 3, fetchedFiles: 3, fetchComplete: true, title: "Test PR", model: "test" };
const ready = () => ({ ...initialState(), prepared: true, metadata, batches: [
  { files: [file("a.js")], status: "completed", attempts: 0, result },
  { files: [file("b.js"), file("c.js")], status: "pending", attempts: 0, result: null },
] });
const deps = { now: 1000, expiresAt: 86401000, prepare: async () => { throw new Error("Unexpected fetch"); } };

test("retry-after seconds and dates are honored; fallback is bounded", () => {
  assert.equal(retryDelay({ headers: { "retry-after": "120" } }, 1, 0), 121000);
  assert.equal(retryDelay({ headers: new Headers({ "retry-after": "Thu, 01 Jan 1970 00:02:00 GMT" }) }, 1, 0), 121000);
  assert.equal(retryDelay({}, 30, 0), 3600000);
});
test("429 retains completed batches and schedules pending work without sleeping", async () => {
  const input = ready();
  const output = await processTick(input, { ...deps, reviewBatch: async files => {
    assert.deepEqual(files.map(f => f.filename), ["b.js", "c.js"]);
    throw Object.assign(new Error("limit"), { status: 429, headers: { "retry-after": "120" } });
  } });
  assert.equal(output.delay, 121000);
  assert.equal(output.cooldown, true);
  assert.equal(output.state.batches[0].status, "completed");
  assert.equal(output.state.batches[1].attempts, 1);
  assert.equal(output.state.skipped.length, 0);
  assert.equal(input.batches[1].attempts, 0);
});
test("persisted state resumes only pending batch, then finalizes all three files", async () => {
  let state = JSON.parse(JSON.stringify(ready()));
  let calls = 0;
  let output = await processTick(state, { ...deps, reviewBatch: async () => { calls++; return result; } });
  output = await processTick(JSON.parse(JSON.stringify(output.state)), { ...deps, reviewBatch: async () => { throw new Error("Must not repeat"); } });
  assert.equal(calls, 1);
  assert.equal(output.state.status, "completed");
  assert.equal(combineReview(output.state).review.coverage.reviewedCount, 3);
});
test("three small files can be a single batch", async () => {
  const state = { ...initialState(), prepared: true, metadata, batches: [{ files: [file("a"), file("b"), file("c")], status: "completed", attempts: 0, result }] };
  const output = await processTick(state, deps);
  const progress = publicProgress({ _id: "id", state: output.state, status: output.state.status });
  assert.equal(progress.reviewedFiles, 3);
  assert.equal(progress.completedBatches, 1);
});
test("authentication failures terminate without dropping successful findings", async () => {
  const output = await processTick(ready(), { ...deps, reviewBatch: async () => { throw Object.assign(new Error(), { status: 401 }); } });
  assert.equal(output.state.status, "partial");
  assert.equal(output.state.skipped.length, 2);
  assert.equal(combineReview(output.state).review.coverage.reviewedCount, 1);
});
test("expired jobs do not call provider", async () => {
  const output = await processTick(ready(), { ...deps, now: 86401000, reviewBatch: async () => { throw new Error("Must not call"); } });
  assert.equal(output.state.status, "partial");
});
test("oversized provider cooldown is reported rather than retried early", async () => {
  const output = await processTick(ready(), { ...deps, reviewBatch: async () => { throw Object.assign(new Error(), { status: 429, headers: { "retry-after": "90000" } }); } });
  assert.equal(output.state.status, "partial");
  assert.equal(output.delay, undefined);
});
test("persistent rate limits eventually become explicit skips", async () => {
  const input = ready(); input.batches[1].attempts = 12;
  const output = await processTick(input, { ...deps, reviewBatch: async () => { throw Object.assign(new Error(), { status: 429 }); } });
  assert.equal(output.state.batches[1].status, "skipped");
  assert.equal(output.state.skipped.length, 2);
});
test("preparation is separate and permanent admission failures make no AI calls", async () => {
  const output = await processTick(initialState(), { ...deps, prepare: async () => { throw Object.assign(new Error(), { permanent: true, publicMessage: "Too large" }); } });
  assert.equal(output.state.status, "failed");
  assert.equal(output.state.message, "Too large");
});
test("no review is constructed when all batches fail", async () => {
  const input = ready(); input.batches = [input.batches[1]]; input.batches[0].attempts = 2;
  let output = await processTick(input, { ...deps, reviewBatch: async () => { throw new SyntaxError("bad JSON"); } });
  output = await processTick(output.state, deps);
  assert.equal(output.state.status, "failed");
  assert.equal(combineReview(output.state), null);
});
