// Coverage is computed per UNIQUE filename/part, never by counting batch entries.
// Legacy jobs without a manifest treat each old unsplit file as a single part.
export function getCoverage(state) {
  const files = new Map();
  function entry(filename) {
    if (!files.has(filename)) files.set(filename, { filename, partCount: 1, sourceComplete: true,
      done: new Set(), pending: new Set(), failed: new Set(), reasons: new Set(), wholeSkipped: false });
    return files.get(filename);
  }
  for (const file of state.fileManifest || []) {
    Object.assign(entry(file.filename), { partCount: file.partCount, sourceComplete: file.sourceComplete !== false });
    if (file.sourceWarning) entry(file.filename).reasons.add(file.sourceWarning);
  }
  for (const batch of state.batches || []) {
    for (const file of batch.files) {
      const target = entry(file.filename);
      target.partCount = Math.max(target.partCount, file.partCount || 1);
      const part = file.partIndex || 1;
      if (batch.status === "completed") target.done.add(part);
      else if (batch.status === "skipped") target.failed.add(part);
      else target.pending.add(part);
    }
  }
  for (const skipped of state.skipped || []) {
    const target = entry(skipped.filename);
    if (skipped.partIndex) {
      target.partCount = Math.max(target.partCount, skipped.partCount || skipped.partIndex);
      target.failed.add(skipped.partIndex);
    } else target.wholeSkipped = true;
    target.reasons.add(skipped.reason);
  }
  const details = [...files.values()].map(file => {
    // Duplicate delivery/checkpoint records cannot inflate completed coverage.
    for (const part of file.done) { file.pending.delete(part); file.failed.delete(part); }
    const completedParts = file.done.size;
    const pendingParts = file.pending.size;
    const isComplete = file.partCount > 0 && completedParts === file.partCount && file.sourceComplete && !file.wholeSkipped;
    const status = isComplete ? "reviewed" : completedParts > 0 ? "partial" : pendingParts > 0 ? "pending" : "skipped";
    return { filename: file.filename, status, totalParts: file.partCount, completedParts,
      pendingParts, unreviewedParts: Math.max(0, file.partCount - completedParts),
      sourceComplete: file.sourceComplete, reasons: [...file.reasons] };
  });
  const names = status => details.filter(f => f.status === status).map(f => f.filename);
  return { files: details, reviewedFiles: names("reviewed"), partialFiles: names("partial"),
    pendingFiles: names("pending"), skippedFiles: names("skipped"),
    completedParts: details.reduce((n, f) => n + f.completedParts, 0),
    totalParts: details.reduce((n, f) => n + f.totalParts, 0) };
}

export function compactState(state) {
  const compact = structuredClone(state);
  for (const batch of compact.batches) {
    batch.files = batch.files.map(({ filename, chunkId, partIndex, partCount }) => ({
      filename, ...(chunkId ? { chunkId, partIndex, partCount } : {}),
    }));
    batch.result = null;
  }
  return compact;
}
