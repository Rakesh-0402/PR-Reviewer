import { Trash2 } from "lucide-react";

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  }

  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffDays < 14) {
    return "1 week ago";
  }

  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  return date.toLocaleDateString();
}

export default function ReviewHistory({
  reviewHistory,
  setReview,
  setSelectedPR,
  deleteReviewHistory,
}) {
  if (reviewHistory.length === 0) return null;

  return (
    <div className="mt-8">

      {/* Heading */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Review History
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Previously generated AI reviews.
        </p>
      </div>

      {/* History List */}
      <div className="space-y-4">

        {reviewHistory.map((item) => (
          <div
            key={item.prNumber}
            className="
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-800
              rounded-xl p-4
              hover:bg-blue-50 dark:hover:bg-gray-800
              transition
              flex justify-between items-center
            "
          >

            {/* Review Information */}
            <div className="min-w-0">
              <h3 className="
                font-semibold text-lg
                text-gray-900 dark:text-gray-100
              ">
                PR #{item.prNumber}
              </h3>

              <p className="
                text-gray-600 dark:text-gray-300
                truncate max-w-xl
              ">
                {item.title}
              </p>

              <p className="
                text-sm
                text-gray-400 dark:text-gray-500
                mt-1
              ">
                {formatRelativeTime(item.reviewedAt)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-4 shrink-0">

              {/* View Review */}
              <button
                onClick={() => {
                  setSelectedPR(item.prNumber);
                  setReview(item.review);
                }}
                className="
                  text-blue-600 dark:text-blue-400
                  font-medium
                  hover:underline
                  whitespace-nowrap
                "
              >
                View Review →
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteReviewHistory(item.prNumber)}
                className="
                  text-red-500 dark:text-red-400
                  hover:text-red-700 dark:hover:text-red-300
                  transition
                "
                title="Delete review"
              >
                <Trash2 size={18} />
              </button>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}