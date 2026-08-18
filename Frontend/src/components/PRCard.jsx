import { ExternalLink } from "lucide-react";

export default function PRCard({
  pr,
  reviewingPR,
  reviewPR,
}) {
  return (
    <div className="w-full min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-md dark:shadow-black/20 transition-colors">

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5">

        <div className="flex gap-3 sm:gap-4 min-w-0">
          <img
            src={pr.user.avatar_url}
            alt=""
            className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-full border border-gray-300 dark:border-gray-700"
          />

        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold leading-tight text-gray-900 dark:text-gray-100 break-words">
            {pr.title}
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-2 break-words">
            by{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {pr.user.login}
            </span>
            {" • "} PR #{pr.number}
            {" • "}
            {new Date(pr.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">

        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold text-center ${
            pr.state === "open"
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          }`}
        >
          {pr.state.toUpperCase()}
        </span>

        <button
          onClick={() => reviewPR(pr.number)}
          disabled={reviewingPR !== null}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition ${
            reviewingPR !== null
              ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {reviewingPR === pr.number ? "Reviewing..." : "Review PR"}
        </button>

        <a
          href={pr.html_url}
          target="_blank"
          rel="noreferrer"
          className="
            w-full sm:w-auto
            flex items-center justify-center gap-2
            border border-gray-300 dark:border-gray-700
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-800
            px-5 py-2 rounded-lg transition
          "
        >
          <ExternalLink size={16} />
          View on GitHub
        </a>

      </div>

  </div>
</div>
  );
}