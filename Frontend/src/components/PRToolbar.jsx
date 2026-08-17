export default function PRToolbar({
  pulls = [],
  search,
  setSearch,
  sort,
  setSort,
  filter,
  setFilter,
}) {
  return (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6
                  border border-gray-200 dark:border-gray-800 mt-6 mb-6">

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pull Requests ({pulls.length})
        </h2>

        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Browse and review repository pull requests.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">

        <input
          type="text"
          placeholder="Search PR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-800
                     text-gray-900 dark:text-gray-100
                     placeholder-gray-400
                     rounded-lg px-4 py-2 w-60"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-800
                     text-gray-900 dark:text-gray-100
                     rounded-lg px-4 py-2"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-800
                     text-gray-900 dark:text-gray-100
                     rounded-lg px-4 py-2"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

      </div>

    </div>

  </div>
);
}