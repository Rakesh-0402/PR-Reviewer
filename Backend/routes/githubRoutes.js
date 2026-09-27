
import express from "express";
import { getPullRequests, getRepository } from "../controllers/githubController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import { createReviewJob, activeReviewJob, getReviewJob } from "../controllers/reviewJobController.js";

const router = express.Router();
router.get("/pulls", getPullRequests);
router.get("/repository", getRepository);
router.post("/reviews", authenticateToken, createReviewJob);
router.get("/reviews/active", authenticateToken, activeReviewJob);
router.get("/reviews/:jobId", authenticateToken, getReviewJob);

// Stop old clients from starting synchronous work that competes with the queue.
router.get("/pulls/:owner/:repo/:pull_number/files", authenticateToken, (req, res) => {
  res.status(410).json({ message: "Review processing has changed. Refresh the application." });
});
export default router;
