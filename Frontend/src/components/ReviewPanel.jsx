import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { exportMarkdown } from "../utils/exportMarkdown";
import { Bot, Copy, Download } from "lucide-react";

export default function ReviewPanel({ review, prNumber }) {
  if (!review) return null;

  function copyReview() {
    navigator.clipboard.writeText(review.markdown);
    toast.success("Review copied!");
  }

  return (
    <div className="mt-8">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl p-6 text-white">

        <div className="flex justify-between items-center flex-wrap gap-4">

          <div className="flex items-center gap-3">

            <div className="bg-white text-blue-600 p-2 rounded-full">
              <Bot size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                AI Code Review
              </h2>

              <p className="text-blue-100 text-sm">
                Generated using Llama 3.3 70B
              </p>
            </div>

          </div>

          <div className="flex gap-3">

            {/* Copy */}
            <button
              onClick={copyReview}
              className="
                bg-white dark:bg-gray-100
                text-blue-600
                px-4 py-2 rounded-lg
                hover:bg-gray-100 dark:hover:bg-white
                transition flex items-center gap-2
              "
            >
              <Copy size={18} />
              Copy
            </button>

            {/* Export */}
            <button
              onClick={() => exportMarkdown(review.markdown, prNumber)}
              className="
                bg-green-600 hover:bg-green-700
                text-white px-4 py-2 rounded-lg
                transition flex items-center gap-2
              "
            >
              <Download size={18} />
              Export
            </button>

          </div>

        </div>

      </div>

      {/* Review Information */}
      <div className="
        bg-white dark:bg-gray-900
        px-6 py-5
        border-x border-gray-200 dark:border-gray-800
      ">

        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Pull Request
        </p>

        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          #{prNumber}
        </h3>

      </div>

      {/* Review Stats */}
      <div className="
        bg-white dark:bg-gray-900
        px-6 pb-6
        border-x border-gray-200 dark:border-gray-800
      ">

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">

          {/* Overall Score */}
          <div className="
            bg-gray-50 dark:bg-gray-800
            rounded-xl p-5 shadow-sm
          ">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Overall Score
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              {review.overallScore}/10
            </h2>
          </div>

          {/* Bugs */}
          <div className="
            bg-gray-50 dark:bg-gray-800
            rounded-xl p-5 shadow-sm
          ">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Bugs
            </p>

            <h2 className="text-3xl font-bold text-red-500 mt-2">
              {review.bugs}
            </h2>
          </div>

          {/* Performance */}
          <div className="
            bg-gray-50 dark:bg-gray-800
            rounded-xl p-5 shadow-sm
          ">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Performance
            </p>

            <h2 className="text-3xl font-bold text-orange-500 mt-2">
              {review.performance}
            </h2>
          </div>

          {/* Security */}
          <div className="
            bg-gray-50 dark:bg-gray-800
            rounded-xl p-5 shadow-sm
          ">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Security
            </p>

            <h2 className="text-3xl font-bold text-green-600 mt-2">
              {review.security}
            </h2>
          </div>

          {/* Best Practices */}
          <div className="
            bg-gray-50 dark:bg-gray-800
            rounded-xl p-5 shadow-sm
          ">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Best Practices
            </p>

            <h2 className="text-3xl font-bold text-purple-600 mt-2">
              {review.bestPractices}
            </h2>
          </div>

        </div>

        {/* Priority Issues */}
        {review.priorityIssues && (

          <div className="mt-8">

            <h3 className="
              font-semibold text-lg
              text-gray-800 dark:text-gray-100
              mb-4
            ">
              Priority Issues
            </h3>

            <div className="space-y-4">

              {review.priorityIssues.map((issue, index) => (

                <div
                  key={index}
                  className="
                    border border-gray-200 dark:border-gray-700
                    rounded-xl p-4
                    bg-gray-50 dark:bg-gray-800
                  "
                >

                  <div className="flex items-center gap-3 mb-2">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        issue.severity === "High"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : issue.severity === "Medium"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                      }`}
                    >
                      {issue.severity}
                    </span>

                    <h4 className="
                      font-semibold
                      text-gray-800 dark:text-gray-100
                    ">
                      {issue.title}
                    </h4>

                  </div>

                  <p className="
                    text-gray-600 dark:text-gray-300
                    text-sm leading-6
                  ">
                    {issue.description}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* AI Summary */}
        <div className="mt-8">

          <h3 className="
            font-semibold text-lg
            text-gray-800 dark:text-gray-100
            mb-2
          ">
            AI Summary
          </h3>

          <p className="
            text-gray-600 dark:text-gray-300
            leading-7
          ">
            {review.summary}
          </p>

        </div>

      </div>

      {/* Estimated Fix Time */}
      <div className="
        bg-white dark:bg-gray-900
        px-6 pb-6
        border-x border-gray-200 dark:border-gray-800
        flex items-center gap-3
      ">

        <span className="text-gray-500 dark:text-gray-400 text-sm">
          Estimated Fix Time:
        </span>

        <span className="font-semibold text-orange-600">
          {review.estimatedFixTime}
        </span>

      </div>

      {/* Markdown Review */}
      <div className="
        bg-white dark:bg-gray-900
        rounded-b-xl shadow-lg
        p-8
        border-x border-b
        border-gray-200 dark:border-gray-800
      ">

        <article className="
          max-w-none
          text-gray-800 dark:text-gray-200
          leading-7
          overflow-x-auto
          break-words
        ">

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }) {

                const match =
                  /language-(\w+)/.exec(className || "");

                return !inline && match ? (

                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>

                ) : (

                  <code
                    className="
                      bg-gray-100 dark:bg-gray-800
                      text-gray-800 dark:text-gray-200
                      px-1 py-0.5 rounded
                    "
                    {...props}
                  >
                    {children}
                  </code>

                );
              },

              h1: ({ children }) => (
                <h1 className="text-gray-900 dark:text-white font-bold text-2xl mt-6 mb-3">
                  {children}
                </h1>
              ),

              h2: ({ children }) => (
                <h2 className="text-gray-900 dark:text-white font-bold text-xl mt-6 mb-3">
                  {children}
                </h2>
              ),

              h3: ({ children }) => (
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg mt-5 mb-2">
                  {children}
                </h3>
              ),

              p: ({ children }) => (
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {children}
                </p>
              ),

              li: ({ children }) => (
                <li className="text-gray-700 dark:text-gray-300">
                  {children}
                </li>
              ),

              strong: ({ children }) => (
                <strong className="text-gray-900 dark:text-white">
                  {children}
                </strong>
              ),
            }}
          >
            {review.markdown}
          </ReactMarkdown>

        </article>

      </div>

    </div>
  );
}