import mongoose from "mongoose";
import ReviewJob from "../models/ReviewJob.js";
import Review from "../models/Review.js";
import { enqueueReview } from "../config/reviewQueue.js";
import { initialState, publicProgress } from "../services/reviewJobCore.js";

export async function createReviewJob(req, res) {
  const owner = typeof req.body?.owner === "string" ? req.body.owner.trim().toLowerCase() : "";
  const repo = typeof req.body?.repo === "string" ? req.body.repo.trim().toLowerCase() : "";
  const prNumber = Number(req.body?.prNumber);
  const userId = String(req.user?.id || "");
  if (!mongoose.isValidObjectId(userId)) return res.status(401).json({ message: "Invalid user identity." });
  if (!/^[a-z0-9-]{1,39}$/.test(owner) || !/^[a-z0-9_.-]{1,100}$/.test(repo) || !Number.isSafeInteger(prNumber) || prNumber < 1) {
    return res.status(400).json({ message: "Enter a valid repository and PR number." });
  }
  try {
    let document;
    try {
      document = await ReviewJob.create({ userId, activeUser: userId, owner, repo, prNumber,
        state: initialState(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    } catch (error) {
      if (error.code !== 11000) throw error;
      document = await ReviewJob.findOne({ activeUser: userId });
      if (!document) return res.status(409).json({ message: "Review state changed. Please retry." });
      if (document.owner !== owner || document.repo !== repo || document.prNumber !== prNumber) {
        return res.status(409).json({ message: "You already have an active review.", job: publicProgress(document) });
      }
    }
    // MongoDB is the durable outbox. The worker reconciler picks up jobs if Redis is temporarily unavailable.
    try { await enqueueReview(document); }
    catch { console.error("Review saved; waiting for queue reconciliation."); }
    return res.status(202).json({ job: publicProgress(document) });
  } catch {
    return res.status(503).json({ message: "Could not save review job. Please retry." });
  }
}

export async function activeReviewJob(req, res) {
  const job = await ReviewJob.findOne({ userId: req.user.id, activeUser: String(req.user.id) });
  res.json({ job: job ? publicProgress(job) : null });
}

export async function getReviewJob(req, res) {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID." });
  const job = await ReviewJob.findOne({ _id: req.params.jobId, userId: req.user.id });
  if (!job) return res.status(404).json({ message: "Review job not found." });
  const result = publicProgress(job);
  if (job.reviewId) {
    const saved = await Review.findOne({ _id: job.reviewId, userId: req.user.id });
    result.review = saved?.review?.review ?? null;
  }
  res.json({ job: result });
}
