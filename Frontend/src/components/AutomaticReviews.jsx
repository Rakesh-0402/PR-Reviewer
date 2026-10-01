import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const INSTALL_URL =
  "https://github.com/apps/automate-pr-reviews/installations/new";

const ENDPOINT =
  `${import.meta.env.VITE_API_URL}/api/github/installation`;

function requestHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function AutomaticReviews({ user }) {
  const [installation, setInstallation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setInstallation(null);

    async function load() {
      try {
        const { data } = await axios.get(ENDPOINT, {
          headers: requestHeaders(),
          signal: controller.signal,
          timeout: 20_000,
        });

        if (!controller.signal.aborted) {
          setInstallation(data.installation);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Unable to load automatic review settings."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [user.id, retry]);

  async function verifyInstallation() {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      const { data } = await axios.post(
        `${ENDPOINT}/connect`,
        {},
        {
          headers: requestHeaders(),
          timeout: 30_000,
        }
      );

      setInstallation(data.installation);
      toast.success("Automatic reviews enabled");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Could not verify installation. Please try again.";

      setError(message);
      toast.error(message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const enabled = installation?.enabled === true;

  return (
    <section
      className="mt-8 rounded-xl border border-gray-200 p-5
                 dark:border-gray-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Automatic PR reviews
        </h2>

        {!loading && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              enabled
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {enabled ? "Enabled" : "Not enabled"}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Get AI feedback in GitHub when a pull request is opened or
        updated in your selected repositories.
      </p>

      {loading ? (
        <p role="status" className="mt-4 text-sm text-gray-500">
          Loading settings…
        </p>
      ) : !user.githubConnected ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Connect your GitHub account above first.
        </p>
      ) : (
        <>
          {enabled ? (
            <p className="mt-4 text-sm text-green-700 dark:text-green-400">
              Connected to @{installation.accountLogin}. Applies to{" "}
              {installation.repositorySelection === "all"
                ? "all repositories allowed by your installation."
                : "the repositories selected in GitHub."}
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Install the app on your personal GitHub account, select
              repositories, then return here to verify.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-4 py-3
                         text-center text-sm font-medium text-gray-800
                         hover:bg-gray-50 dark:border-gray-600
                         dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {enabled ? "Manage GitHub installation ↗" : "Install GitHub App ↗"}
            </a>

            <button
              type="button"
              onClick={verifyInstallation}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-3 text-sm
                         font-medium text-white hover:bg-blue-700
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Verifying…"
                : enabled
                  ? "Verify connection"
                  : "Verify and enable"}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetry(value => value + 1)}
            className="mt-2 text-sm text-blue-600 underline dark:text-blue-400"
          >
            Reload settings
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Reviews use your selected repositories’ code patches. Processing
        depends on worker availability and AI usage limits.
      </p>
    </section>
  );
}