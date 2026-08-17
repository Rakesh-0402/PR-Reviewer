import axios from "axios";
import { reviewCode } from "../services/groqService.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

export async function getPullRequests(req, res) {
  try {
    const { owner, repo } = req.query;

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    console.log(err.response?.data || err.message);

    return res.status(500).json({
      message: "Unable to fetch pull requests",
      error: err.response?.data || err.message,
    });
  }
}


// Review a specific pull request
export async function getPullRequestFiles(req, res) {
  try {
    const { owner, repo, pull_number } = req.params;

    const prNumber = Number(pull_number);
    const userId = req.user.id;

    // Fetch PR files from GitHub
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    // Combine changed code patches
    const patches = response.data
      .map((file) => file.patch)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 40000);

    // Send code to AI
    const review = await reviewCode(patches);

    let reviewObject;

    try {
      reviewObject = JSON.parse(review);
    } catch (err) {
      console.error("Failed to parse AI response:", err);

      return res.status(500).json({
        message: "AI returned invalid JSON.",
      });
    }

    /*
     * Check whether this user has already reviewed
     * this particular PR.
     *
     * This allows totalReviews to represent
     * unique PRs reviewed.
     */
    const existingReview = await Review.findOne({
      userId,
      owner,
      repo,
      prNumber,
    });

    // Save the review
    const reviewDoc = new Review({
      userId,
      owner,
      repo,
      prNumber,
      review: reviewObject,
    });

    await reviewDoc.save();

    /*
     * Only increase totalReviews when this is
     * the first review of this particular PR.
     */
    if (!existingReview) {
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            totalReviews: 1,
          },
        },
        {
          new: true,
        }
      );
    }

    // Return AI review
    return res.status(200).json({
      review: reviewObject,
    });

  } catch (err) {
  console.log(err.message);

  if (err.message === "AI review limit reached. Please try again later.") {
    return res.status(429).json({
      message: err.message,
    });
  }

  return res.status(500).json({
    message: "Unable to generate review",
    error: err.message,
  });
}
}


// Fetch repository details
export async function getRepository(req, res) {
  try {
    const { owner, repo } = req.query;

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    console.log(response.data.full_name);

    return res.status(200).json(response.data);

  } catch (err) {
    console.log(err.response?.data || err.message);

    return res.status(500).json({
      message: "Unable to fetch repository",
      error: err.response?.data || err.message,
    });
  }
}