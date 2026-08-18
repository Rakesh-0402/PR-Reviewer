import {
  Star,
  GitFork,
  Eye,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function RepositoryCard({ repoData }) {
  if (!repoData) return null;

  function formatNumber(number) {
    if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    }

    if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    }

    return number.toString();
  }

  return (
    <div className="w-full min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-md p-4 sm:p-6 md:p-8 transition-colors">
      {/* Top */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">

        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {repoData.full_name}
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {repoData.description || "No description provided."}
          </p>
        </div>

        <a
          href={repoData.html_url}
          target="_blank"
          rel="noreferrer"
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition"
        >
          <ExternalLink size={18} />
          GitHub
        </a>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 transition-colors">
          <Star className="text-yellow-500 mb-2" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stars
          </p>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(repoData.stargazers_count)}
          </h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 transition-colors">
          <GitFork className="text-blue-500 mb-2" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Forks
          </p>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(repoData.forks_count)}
          </h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 transition-colors">
          <Eye className="text-green-500 mb-2" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Watchers
          </p>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(repoData.watchers_count)}
          </h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 transition-colors">
          <AlertCircle className="text-red-500 mb-2" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open Issues
          </p>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(repoData.open_issues_count)}
          </h3>
        </div>

      </div>

      {/* Repository Details */}
      <div className="grid md:grid-cols-2 gap-8 mt-8">

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Primary Language
          </p>

          <div className="mt-1">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full font-medium">
              {repoData.language || "Unknown"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            License
          </p>

          <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {repoData.license?.name || "No License"}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created
          </p>

          <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {new Date(repoData.created_at).toLocaleDateString()}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last Updated
          </p>

          <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {new Date(repoData.updated_at).toLocaleDateString()}
          </p>
        </div>

      </div>

      {/* Topics */}
      <div className="mt-8">

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Topics
        </h3>

        <div className="flex flex-wrap gap-3">

          {repoData.topics.map((topic) => (
            <span
              key={topic}
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-medium"
            >
              {topic}
            </span>
          ))}

        </div>

      </div>

    </div>
  );
}