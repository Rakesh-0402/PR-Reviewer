import { useEffect, useState } from "react";
import axios from "axios";
import { Bot, GitPullRequest, CalendarDays } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ConnectGithub from "../components/ConnectGithub";
import AutomaticReviews from "../components/AutomaticReviews";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login", { replace: true }); return; }
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, timeout: 20_000,
        });
        if (!data.user) throw new Error("Missing profile");
        if (!controller.signal.aborted) setUser(data.user);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("auth-changed"));
          navigate("/login", { replace: true }); return;
        }
        setError("Unable to load your profile. Please try again.");
      }
    }
    fetchProfile();
    return () => controller.abort();
  }, [navigate, retry]);
  if (!user) return <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
    <div className="text-center text-gray-600 dark:text-gray-300"><p role={error ? "alert" : "status"}>{error || "Loading profile…"}</p>
      {error && <button onClick={() => setRetry(n => n + 1)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white">Try again</button>}
    </div>
  </main>;
  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return <main className="min-h-screen bg-gray-100 px-4 py-8 transition-colors sm:px-6 sm:py-12 dark:bg-gray-950">
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="mb-6 inline-flex text-blue-600 hover:text-blue-700 dark:text-blue-400">← Back to Dashboard</Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600"><Bot className="text-white" size={38} /></div>
          <div className="min-w-0"><h1 className="break-words text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">{user.name}</h1>
            <p className="mt-1 break-words text-gray-500 dark:text-gray-400">{user.email}</p></div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-6 text-center dark:border-gray-800"><GitPullRequest className="mx-auto mb-3 text-blue-600" size={25} />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{user.totalReviews ?? 0}</p><p className="mt-1 text-gray-500 dark:text-gray-400">PRs Reviewed</p></div>
          <div className="rounded-xl border border-gray-200 p-6 text-center dark:border-gray-800"><CalendarDays className="mx-auto mb-3 text-blue-600" size={25} />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Joined</p><p className="mt-1 text-gray-500 dark:text-gray-400">{joinedDate}</p></div>
        </div>
        <ConnectGithub user={user} />
        <AutomaticReviews user ={user} />
      </div>
    </div>
  </main>;
}
