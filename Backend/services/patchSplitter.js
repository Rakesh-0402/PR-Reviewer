import { createHash } from "node:crypto";

const HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
const NO_NEWLINE = "\\ No newline at end of file";

// Parse GitHub's per-file unified diff, not complete .diff files with diff --git headers.
// Coordinates are cursor positions BEFORE each row. A zero-count range points
// immediately before the next line, hence the +1 when initializing its cursor.
export function parsePatch(patch) {
  const lines = patch.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const hunks = [];
  let hunk;
  let oldNext;
  let newNext;
  function finish() {
    if (!hunk) return;
    const oldCount = hunk.rows.filter(r => r.text[0] !== "+").length;
    const newCount = hunk.rows.filter(r => r.text[0] !== "-").length;
    if (!hunk.rows.length || oldCount !== hunk.oldCount || newCount !== hunk.newCount) {
      throw new Error("Diff section counts do not match its lines; patch may be incomplete.");
    }
    hunks.push(hunk);
  }
  for (const text of lines) {
    const match = HEADER.exec(text);
    if (match) {
      finish();
      const [oldStart, oldCount, newStart, newCount] = [Number(match[1]), Number(match[2] ?? 1), Number(match[3]), Number(match[4] ?? 1)];
      if (![oldStart, oldCount, newStart, newCount].every(Number.isSafeInteger) ||
          (oldCount > 0 && oldStart < 1) || (newCount > 0 && newStart < 1)) {
        throw new Error("Invalid diff coordinates.");
      }
      hunk = { oldStart, oldCount, newStart, newCount, suffix: match[5], rows: [] };
      oldNext = oldStart + (oldCount === 0 ? 1 : 0);
      newNext = newStart + (newCount === 0 ? 1 : 0);
    } else if (text === NO_NEWLINE) {
      const row = hunk?.rows.at(-1);
      if (!row || row.noNewline) throw new Error("Invalid no-newline marker.");
      row.noNewline = true;
    } else {
      if (!hunk || ![" ", "+", "-"].includes(text[0])) throw new Error("Unsupported or malformed unified diff.");
      hunk.rows.push({ text, oldNext, newNext, noNewline: false });
      if (text[0] !== "+") oldNext++;
      if (text[0] !== "-") newNext++;
    }
  }
  finish();
  if (!hunks.length) throw new Error("No valid diff sections were provided.");
  return hunks;
}

export function renderSection(rows, suffix = "") {
  const oldCount = rows.filter(r => r.text[0] !== "+").length;
  const newCount = rows.filter(r => r.text[0] !== "-").length;
  const oldStart = rows[0].oldNext - (oldCount === 0 ? 1 : 0);
  const newStart = rows[0].newNext - (newCount === 0 ? 1 : 0);
  const body = rows.flatMap(r => r.noNewline ? [r.text, NO_NEWLINE] : [r.text]);
  return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${suffix}`, ...body].join("\n");
}

function unit(file, patch, partIndex, partCount, chunkId) {
  return {
    filename: file.filename, previousFilename: file.previousFilename || null,
    status: file.status || "modified", additions: file.additions ?? null,
    deletions: file.deletions ?? null, chunkId, partIndex, partCount,
    scope: partCount > 1 ? "file-fragment" : "file-patch", patch,
  };
}

export function splitFile(file, fitsBatch) {
  const hunks = parsePatch(file.patch);
  // Reserve more metadata digits than actual parts can use. Final payloads are
  // also checked, so metadata never silently pushes a chunk over the budget.
  const canFit = patch => fitsBatch([unit(file, patch, 999999, 999999, "f".repeat(64))]);
  const patches = [];
  let current = "";
  const pushCurrent = () => { if (current) patches.push(current); current = ""; };
  for (const hunk of hunks) {
    const whole = renderSection(hunk.rows, hunk.suffix);
    if (canFit(whole)) {
      const candidate = current ? `${current}\n${whole}` : whole;
      if (canFit(candidate)) current = candidate;
      else { pushCurrent(); current = whole; }
      continue;
    }
    pushCurrent();
    let offset = 0;
    while (offset < hunk.rows.length) {
      let low = 1;
      let high = hunk.rows.length - offset;
      let best = 0;
      while (low <= high) {
        const length = Math.floor((low + high) / 2);
        const section = renderSection(hunk.rows.slice(offset, offset + length), hunk.suffix);
        if (canFit(section)) { best = length; low = length + 1; }
        else high = length - 1;
      }
      if (!best) throw new Error("A single diff line or its metadata exceeds the input budget; file was not cut mid-line.");
      patches.push(renderSection(hunk.rows.slice(offset, offset + best), hunk.suffix));
      offset += best;
    }
  }
  pushCurrent();
  if (patches.length > 999999) throw new Error("Too many patch fragments.");
  const units = patches.map((patch, index) => unit(file, patch, index + 1, patches.length,
    createHash("sha256").update(`${file.filename}\0${index + 1}\0${patch}`).digest("hex")));
  if (units.some(piece => !fitsBatch([piece]))) throw new Error("Chunk metadata exceeded the input budget.");
  const rows = hunks.flatMap(h => h.rows);
  const additions = rows.filter(r => r.text[0] === "+").length;
  const deletions = rows.filter(r => r.text[0] === "-").length;
  const sourceComplete = (!Number.isInteger(file.additions) || additions === file.additions) &&
    (!Number.isInteger(file.deletions) || deletions === file.deletions);
  return { units, sourceComplete, sourceWarning: sourceComplete ? null : "Patch change counts differ from GitHub file totals; source coverage is incomplete." };
}

export function skipPiece(file, reason) {
  return { filename: file.filename, ...(file.chunkId ? {
    chunkId: file.chunkId, partIndex: file.partIndex, partCount: file.partCount,
  } : {}), reason };
}

export function buildPatchBatches(files, { fitsBatch, maxBatches = 40 }) {
  if (!Number.isInteger(maxBatches) || maxBatches < 1) throw new Error("Invalid batch limit.");
  const batches = [];
  const skipped = [];
  const fileManifest = [];
  let current = [];
  const seen = new Set();
  for (const file of files) {
    if (!file.filename || seen.has(file.filename)) throw new Error("Missing or duplicate filename in PR input.");
    seen.add(file.filename);
    if (typeof file.patch !== "string" || !file.patch.trim()) {
      skipped.push(skipPiece(file, "GitHub returned no text patch."));
      fileManifest.push({ filename: file.filename, partCount: 0, sourceComplete: false });
      continue;
    }
    let split;
    try { split = splitFile(file, fitsBatch); }
    catch (error) {
      skipped.push(skipPiece(file, error.message));
      fileManifest.push({ filename: file.filename, partCount: 0, sourceComplete: false });
      continue;
    }
    fileManifest.push({ filename: file.filename, partCount: split.units.length,
      sourceComplete: split.sourceComplete, sourceWarning: split.sourceWarning });
    for (const piece of split.units) {
      if (current.length && !fitsBatch([...current, piece])) {
        batches.push(current);
        current = [];
      }
      if (batches.length >= maxBatches) {
        skipped.push(skipPiece(piece, "Per-review batch limit reached; this part was not scheduled."));
      } else current.push(piece);
    }
  }
  if (current.length) batches.push(current);
  return { batches, skipped, fileManifest, planVersion: 2 };
}
