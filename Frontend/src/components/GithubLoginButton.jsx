import { useRef, useState } from "react";
import { LogIn } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
export default function GithubLoginButton({ disabled = false }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function begin() {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    try {
      const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/github/start`, { challenge }, { timeout: 30_000 });
      const url = new URL(data.url);
      if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize" || !data.state) throw new Error("Invalid authorization URL");
      sessionStorage.setItem("githubLoginAttempt", JSON.stringify({ verifier, state: data.state, purpose: "login" }));
      window.location.assign(url.href);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start GitHub sign-in. Please try again.");
      lock.current = false;
      setBusy(false);
    }
  }
  return <button type="button" onClick={begin} disabled={disabled || busy}
    className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600">
    <LogIn size={20} aria-hidden="true" />{busy ? "Connecting to GitHub…" : "Continue with GitHub"}
  </button>;
}
