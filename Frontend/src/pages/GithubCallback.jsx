import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { clearDashboardSession } from "../utils/dashboardSession.js";
// Share one exchange across StrictMode's effect replay. Never retry a consumed code automatically.
let pendingExchange;
function exchange() {
  if (pendingExchange) return pendingExchange;
  pendingExchange = (async () => {
    const params = new URLSearchParams(window.location.search);
    const saved = JSON.parse(sessionStorage.getItem("githubLoginAttempt") || "null");
    sessionStorage.removeItem("githubLoginAttempt");
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (params.get("error")) throw new Error("GitHub sign-in was cancelled or denied. Please try again.");
    if (!saved?.verifier || !saved.state || params.get("state") !== saved.state || !params.get("code")) throw new Error("Sign-in could not be verified. Start again in this browser tab.");
    const linking = saved.purpose === "link";
    const currentToken = localStorage.getItem("token");
    if (linking) {
      let current;
      try { current = jwtDecode(currentToken || ""); } catch { /* Fail closed below. */ }
      if (!current?.id || current.id !== saved.userId || !(current.exp * 1000 > Date.now())) {
        throw new Error("Your signed-in account changed or expired. Log in and start linking again.");
      }
    }
    const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/github/${linking ? "link/exchange" : "exchange"}`, {
      code: params.get("code"), state: saved.state, verifier: saved.verifier,
    }, { timeout: 60_000, ...(linking ? { headers: { Authorization: `Bearer ${currentToken}` } } : {}) });
    if (linking) {
      if (!data.linked) throw new Error("Could not confirm the GitHub connection.");
      return { destination: "/profile", message: "GitHub connected successfully" };
    }
    const decoded = jwtDecode(data.token);
    if (!decoded.id || !(decoded.exp * 1000 > Date.now())) throw new Error("Invalid login response.");
    try { clearDashboardSession(decoded.id); } catch { /* Optional browser cache. */ }
    localStorage.setItem("token", data.token);
    window.dispatchEvent(new Event("auth-changed"));
    return { destination: "/dashboard", message: "Logged in with GitHub" };
  })();
  return pendingExchange;
}
export default function GithubCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    exchange().then(result => {
      if (!active) return;
      toast.success(result.message, { id: "github-login" });
      navigate(result.destination, { replace: true });
    }).catch(err => {
      if (active) setError(err.response?.data?.message || err.message || "GitHub login failed.");
    });
    return () => { active = false; };
  }, [navigate]);
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
    <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">GitHub authorization</h1>
      <p role={error ? "alert" : "status"} className="mt-4 text-gray-600 dark:text-gray-300">{error || "Finishing authorization…"}</p>
      {error && <Link to="/login" replace className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-white">Back to login</Link>}
    </section>
  </main>;
}
