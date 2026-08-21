export default function SearchRepository({
  owner,
  repo,
  setOwner,
  setRepo,
  fetchPullRequests,
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8 mb-8 transition-colors ">

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Search GitHub Repository
      </h2>

      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Enter a repository owner and repository name.
      </p>

      <div className="flex flex-col md:flex-row gap-4">

        <input
          type="text"
          autoComplete="off"
          placeholder="Repository Owner (e.g. facebook)"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="
            flex-1 rounded-lg p-3
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            border border-gray-300 dark:border-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />

        <input
          type="text"
          autoComplete="off"
          placeholder="Repository Name (e.g. react)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="
            flex-1 rounded-lg p-3
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            border border-gray-300 dark:border-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />

        <button
          type ="button"
          onClick={fetchPullRequests}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition"
        >
          Fetch PRs
        </button>

      </div>
    </div>
  );
}