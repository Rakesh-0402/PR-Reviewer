import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-10">

      {/* Left Content */}
      <div className ="min-w-0">
        <p className="max-w-lg text-blue-600 font-semibold mb-4">
          AI Powered Code Reviews
        </p>

        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
          Review Your Pull Requests
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {" "}Using AI
          </span>
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-lg mt-6">
          Analyze your GitHub pull requests in seconds. Detect bugs,
          improve readability, optimize performance, and receive
          professional feedback before merging your code.
        </p>

        <div className="flex gap-4 mt-8">

          {/* Get Started */}
          <Link to="/signup">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
              Get Started
            </button>
          </Link>

          {/* How It Works */}
          <a href="#how-it-works">
            <button
              className="
                border border-gray-300 dark:border-gray-700
                text-gray-700 dark:text-gray-200
                px-6 py-3 rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition
              "
            >
              See How It Works
            </button>
          </a>

        </div>
      </div>

      {/* AI Review Preview */}
      <div
        className="
          w-full min-w-0
          bg-white dark:bg-gray-900
          rounded-2xl
          shadow-xl
          p-4 sm:p-6
          border border-gray-200 dark:border-gray-800
        "
      >

        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          AI Review Summary
        </h3>

        <div className="space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              Bug Detection
            </span>
            <span className="text-green-600 font-semibold">
              Passed
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              Performance
            </span>
            <span className="text-yellow-600 font-semibold">
              Improved
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              Readability
            </span>
            <span className="text-blue-600 font-semibold">
              Excellent
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              Security
            </span>
            <span className="text-green-600 font-semibold">
              Safe
            </span>
          </div>

        </div>

        {/* Generate Full Review */}
        <Link to="/login" className ="block">
          <button className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
            Generate Full Review
          </button>
        </Link>

      </div>

    </section>
  );
}