import "dotenv/config";
import crypto from "node:crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import AuthLinkLimit from "../models/AuthLinkLimit.js";
import User from "../models/User.js";
import OAuthAttempt from "../models/OAuthAttempt.js";

const hash = value => crypto.createHash("sha256").update(value).digest("base64url");
const validSecret = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
function config() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri || !process.env.JWT_SECRET) throw new Error("OAuth configuration missing");
  const url = new URL(redirectUri);
  if (url.origin !== new URL(process.env.FRONTEND_URL).origin || url.pathname !== "/auth/github/callback" || url.search || url.hash) throw new Error("Invalid OAuth callback configuration");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("HTTPS required");
  return { clientId, clientSecret, redirectUri };
}
export async function beginGithubLogin(req, res) {
  res.set("Cache-Control", "no-store");
  if (!validSecret(req.body?.challenge)) return res.status(400).json({ message: "Invalid login request." });
  try {
    const cfg = config();
    const linking = req.githubPurpose === "link";
    let target;
    if (linking) {
      if (!req.user?.id) return res.status(401).json({ message: "Please log in again." });
      const windowId = Math.floor(Date.now() / (15 * 60_000));
      const limit = await AuthLinkLimit.findOneAndUpdate(
        { _id: `${req.user.id}:${windowId}` },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((windowId + 2) * 15 * 60_000) } },
        { upsert: true, new: true }
      );
      if (limit.count > 5) return res.status(429).json({ message: "Too many linking attempts. Try again in 15 minutes." });
      target = await User.findById(req.user.id);
      if (!target) return res.status(401).json({ message: "Account no longer exists." });
      if (target.githubId) return res.status(409).json({ message: "A GitHub account is already connected." });
      const password = req.body?.password;
      if (!target.password || typeof password !== "string" || password.length > 1024 ||
          !(await bcrypt.compare(password, target.password))) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
    }
    const state = crypto.randomBytes(32).toString("base64url");
    const verifier = crypto.randomBytes(32).toString("base64url");
    await OAuthAttempt.create({ stateHash: hash(state), browserChallenge: req.body.challenge,
      githubVerifier: verifier, purpose: linking ? "link" : "login", userId: target?._id,
      passwordFingerprint: target ? hash(target.password) : undefined, expiresAt: new Date(Date.now() + 10 * 60_000) });
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirectUri,
      scope: linking ? "read:user" : "read:user user:email", ...(linking ? { prompt: "select_account" } : {}), state, code_challenge: hash(verifier), code_challenge_method: "S256" }).toString();
    return res.json({ url: url.href, state });
  } catch (error) {
    console.error("GitHub start failed:", { type: error.name });
    return res.status(503).json({ message: "GitHub sign-in is unavailable. Check the server configuration." });
  }
}
export async function finishGithubLogin(req, res) {
  res.set("Cache-Control", "no-store");
  const { state, verifier, code } = req.body || {};
  if (!validSecret(state) || !validSecret(verifier) || typeof code !== "string" || !code || code.length > 512) {
    return res.status(400).json({ message: "Invalid GitHub sign-in response. Please start again." });
  }
  try {
    const cfg = config();
    // Atomic consume: expired, mismatched and replayed attempts cannot authenticate.
    const linking = req.githubPurpose === "link";
    if (linking && !req.user?.id) return res.status(401).json({ message: "Please log in again." });
    const attempt = await OAuthAttempt.findOneAndDelete({ stateHash: hash(state),
      purpose: linking ? "link" : "login", ...(linking ? { userId: req.user.id } : {}),
      browserChallenge: hash(verifier), expiresAt: { $gt: new Date() } });
    if (!attempt) return res.status(400).json({ message: "Sign-in expired or was already used. Please start again." });
    const { data: tokenData } = await axios.post("https://github.com/login/oauth/access_token", {
      client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri,
      code, code_verifier: attempt.githubVerifier,
    }, { headers: { Accept: "application/json" }, timeout: 20_000 });
    if (!tokenData.access_token || tokenData.error) return res.status(400).json({ message: "GitHub authorization failed. Please start again." });
    const options = { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" }, timeout: 20_000 };
    const { data: profile } = await axios.get("https://api.github.com/user", options);
    if (!Number.isSafeInteger(profile.id) || !profile.login) throw new Error("Invalid GitHub identity");
    const githubId = String(profile.id);
    if (linking) {
      const target = await User.findById(req.user.id);
      if (!target || !target.password || hash(target.password) !== attempt.passwordFingerprint) {
        return res.status(401).json({ message: "Account credentials changed. Start linking again." });
      }
      if (target.githubId) return res.status(409).json({ message: "A GitHub account is already connected." });
      const owner = await User.findOne({ githubId });
      if (owner) return res.status(409).json({ message: "This GitHub account already belongs to another PR Reviewer account. Accounts cannot be merged here." });
      // Atomic guard prevents concurrent callbacks replacing an existing link.
      // Unique githubId index prevents the same GitHub identity linking to two accounts.
      const linked = await User.findOneAndUpdate({ _id: target._id, password: target.password,
        $or: [{ githubId: { $exists: false } }, { githubId: null }] },
        { $set: { githubId, githubUsername: profile.login, avatarUrl: profile.avatar_url } }, { new: true });
      if (!linked) return res.status(409).json({ message: "Account changed while linking. Reload your profile." });
      return res.json({ linked: true, githubUsername: profile.login });
    }
    let user = await User.findOne({ githubId });
    if (!user) {
      const { data: emails } = await axios.get("https://api.github.com/user/emails", options);
      const emailRow = Array.isArray(emails) && (emails.find(e => e.verified && e.primary) || emails.find(e => e.verified));
      if (!emailRow?.email) return res.status(400).json({ message: "Add and verify an email in GitHub settings, then try again." });
      const email = emailRow.email.trim().toLowerCase();
      // No implicit linking: existing password accounts must keep their identity/history.
      const existing = await User.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      if (existing) return res.status(409).json({ message: "An account already uses this email. Sign in with your existing method. Then open Profile and choose Connect GitHub." });
      user = await User.create({ name: (profile.name || profile.login).slice(0, 200), email,
        githubId, githubUsername: profile.login, avatarUrl: profile.avatar_url });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    // GitHub access token is neither stored nor sent to the browser.
    return res.json({ token });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "This account was created or linked by another request. Reload your profile or sign in again." });
    // Do not log Axios errors: their config contains OAuth credentials.
    console.error("GitHub sign-in failed:", { status: error.response?.status, type: error.name });
    return res.status(502).json({ message: "GitHub sign-in could not finish. Please start again." });
  }
}

export function beginGithubLink(req, res) {
  req.githubPurpose = "link";
  return beginGithubLogin(req, res);
}
export function finishGithubLink(req, res) {
  req.githubPurpose = "link";
  return finishGithubLogin(req, res);
}
