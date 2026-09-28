export default function ReviewProgressCounts({ job }) {
  if (job?.totalFiles == null) return null;
  return (
    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
      {job.reviewedFiles}/{job.totalFiles} files fully reviewed
      {job.partialFiles > 0 && ` · ${job.partialFiles} files partially reviewed`}
      {job.totalParts != null && ` · ${job.completedParts}/${job.totalParts} patch parts reviewed`}
      {` · ${job.completedBatches}/${job.totalBatches} batches completed`}
      {job.skippedFiles > 0 && ` · ${job.skippedFiles} files skipped`}
    </p>
  );
}
