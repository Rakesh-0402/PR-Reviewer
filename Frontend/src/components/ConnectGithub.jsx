import { useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
export default function ConnectGithub({ user }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function connect(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const decoded = jwtDecode(token || "");
      if (!decoded.id || !(decoded.exp * 1000 > Date.now())) throw new Error("Please log in again before linking.");
      const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/github/link/start`,
        { challenge, password }, { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });
      const url = new URL(data.url);
      if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize" || !data.state) throw new Error("Invalid GitHub redirect.");
      sessionStorage.setItem("githubLoginAttempt", JSON.stringify({ purpose: "link", verifier, state: data.state, userId: decoded.id }));
      setPassword("");
      window.location.assign(url.href);
    } catch (err) {
      setError(err.response?.data?.message || "Could not connect GitHub. Check your session and try again.");
      setPassword(""); setBusy(false); lock.current = false;
    }
  }
  return <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">GitHub connection</h2>
    {user.githubConnected ? <div className="mt-4 rounded-xl bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-200">
      Connected{user.githubUsername ? ` as @${user.githubUsername}` : ""}. You can sign in with GitHub.
    </div> : user.hasPassword ? <form onSubmit={connect} className="mt-4 space-y-4" aria-busy={busy}>
      <p className="text-sm text-gray-600 dark:text-gray-300">Connect a GitHub account to sign in to this profile. Your emails can differ. Your app email, reviews and stats will stay the same.</p>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="link-password">Confirm your PR Reviewer password</label>
      <input id="link-password" type="password" autoComplete="current-password" required maxLength={1024}
        disabled={busy} value={password} onChange={e => setPassword(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:outline-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy || !password} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto">
        <LogIn size={18} aria-hidden="true" />{busy ? "Connecting…" : "Connect GitHub"}
      </button>
    </form> : <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Connection details are unavailable. Reload the profile after updating the backend.</p>}
  </section>;
}
