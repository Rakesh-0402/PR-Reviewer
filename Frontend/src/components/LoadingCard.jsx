export default function LoadingCard({ loading }) {
  if (!loading) return null;

  return (
    <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 flex items-center gap-5">

      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI is reviewing your Pull Request...
        </h2>

        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Analyzing bugs, performance, security and code quality.
        </p>
      </div>

    </div>
  );
}