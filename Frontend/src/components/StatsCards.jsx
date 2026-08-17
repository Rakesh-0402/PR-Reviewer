export default function StatsCards({ pulls }) {
  const openPRs = pulls.filter((pr) => pr.state === "open").length;

  const totalComments = pulls.reduce(
    (sum, pr) => sum + (pr.comments || 0),
    0
  );

  const totalAuthors = new Set(
    pulls.map((pr) => pr.user.login)
  ).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-gray-500 text-sm">Open Pull Requests</h3>
        <p className="text-4xl font-bold text-blue-600 mt-2">
          {openPRs}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-gray-500 text-sm">Contributors</h3>
        <p className="text-4xl font-bold text-green-600 mt-2">
          {totalAuthors}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-gray-500 text-sm">Comments</h3>
        <p className="text-4xl font-bold text-purple-600 mt-2">
          {totalComments}
        </p>
      </div>

    </div>
  );
}