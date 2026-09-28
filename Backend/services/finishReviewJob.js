import { compactState } from "./reviewCoverage.js";
import mongoose from "mongoose";
import ReviewJob from "../models/ReviewJob.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { combineReview } from "./reviewJobCore.js";

// MongoDB Atlas supports transactions. Local MongoDB must use a replica set.
export async function finishReviewJob(id, state) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const job = await ReviewJob.findById(id).session(session);
      if (!job || !job.activeUser) return;
      const payload = combineReview(state);
      let reviewId;
      if (payload) {
        const existing = await Review.findOne({ jobId: job._id }).session(session);
        if (existing) reviewId = existing._id;
        else {
          const previouslyReviewed = await Review.exists({ userId: job.userId, owner: job.owner, repo: job.repo, prNumber: job.prNumber }).session(session);
          const [saved] = await Review.create([{
            jobId: job._id, userId: job.userId, owner: job.owner, repo: job.repo,
            prNumber: job.prNumber, title: state.metadata.title, review: payload,
          }], { session });
          reviewId = saved._id;
          if (!previouslyReviewed) await User.updateOne({ _id: job.userId }, { $inc: { totalReviews: 1 } }, { session });
        }
      }
      // Keep results/coverage but discard large source patches after finalization.
      const compact = compactState(state);
      await ReviewJob.updateOne({ _id: id }, {
        $set: { state: compact, status: state.status, nextRunAt: null, ...(reviewId ? { reviewId } : {}) },
        $unset: { activeUser: 1 },
      }, { session });
    });
  } finally { await session.endSession(); }
}
