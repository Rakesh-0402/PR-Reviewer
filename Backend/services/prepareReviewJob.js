import axios from "axios";
import { buildBatches } from "./groqService.js";

function reject(message) {
  const error = new Error(message);
  error.publicMessage = message;
  error.permanent = true;
  throw error;
}

export async function prepareReviewJob(
  document, 
  token = process.env.GITHUB_TOKEN?.trim()
) {
  if (!token) reject("GitHub authentication is not configured.");
  const url = `https://api.github.com/repos/${encodeURIComponent(document.owner)}/${encodeURIComponent(document.repo)}/pulls/${document.prNumber}`;

  const options = {
    headers: { 
      Authorization: `Bearer ${token}`, 
      Accept: "application/vnd.github+json" 
    },
    timeout: 20_000, maxContentLength: 3_000_000,
  };
  const { data: pr } = await axios.get(url, options);
  // Automatic jobs must review the version that triggered the webhook.
  if (
    document.headSha &&
    (
      pr.head.sha !== document.headSha ||
      pr.base.sha !== document.baseSha
    )
  ) {
    reject("This PR version is outdated.");
  }
  // Explicit admission limits keep a single MongoDB job document bounded.
  if (pr.changed_files > 300) reject("This version supports PRs with up to 300 changed files.");
  const files = new Map();
  let totalBytes = 0;
  let more = false;
  for (let page = 1; page <= 3; page++) {
    const response = await axios.get(`${url}/files`, { ...options, params: { per_page: 100, page } });
    if (!Array.isArray(response.data)) reject("GitHub returned an invalid file list.");
    for (const f of response.data) {
      const file = { filename: f.filename, previousFilename: f.previous_filename || null,
        status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch || null };
      totalBytes += Buffer.byteLength(JSON.stringify(file));
      if (totalBytes > 2_000_000) reject("PR patches exceed this version's 2 MB input allowance.");
      files.set(file.filename, file);
    }
    more = /rel="next"/.test(response.headers.link || "");
    if (!more) break;
  }
  const { data: after } = await axios.get(url, options);
  if (pr.head.sha !== after.head.sha || pr.base.sha !== after.base.sha || pr.changed_files !== after.changed_files) {
    reject("PR changed during retrieval. Start a new review for the latest commit.");
  }
  if (more || files.size !== pr.changed_files) reject("GitHub file retrieval was incomplete. Try again later.");
  const plan = buildBatches([...files.values()]);
  console.log("Skipped PR files:", plan.skipped);
  console.table(
  (plan.fileManifest || [])
    .filter(file => file.partCount > 1)
    .map(file => ({
      filename: file.filename,
      parts: file.partCount,
    }))
);
  return { ...plan, metadata: { title: pr.title, headSha: pr.head.sha, baseSha: pr.base.sha,
    totalFiles: pr.changed_files, fetchedFiles: files.size, fetchComplete: true,
    model: "openai/gpt-oss-120b" } };
}
