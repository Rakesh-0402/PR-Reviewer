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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Please log in to review a pull request.",
      });
    }

    if (
      !owner ||
      !repo ||
      !Number.isSafeInteger(prNumber) ||
      prNumber < 1
    ) {
      return res.status(400).json({
        message: "Invalid repository or pull request number.",
      });
    }

    const token = process.env.GITHUB_TOKEN?.trim();

    if (!token) {
      return res.status(503).json({
        message: "GitHub authentication is not configured.",
      });
    }

    const baseUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
      `/pulls/${prNumber}`;

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      timeout: 20_000,
    };

    // Record the PR version associated with this review.
    const { data: pr } = await axios.get(baseUrl, requestOptions);

    const filesByName = new Map();
    let hasNextPage = false;

    // 100 files/page, capped at 30 pages.
    for (let page = 1; page <= 30; page++) {
      const response = await axios.get(`${baseUrl}/files`, {
        ...requestOptions,
        params: {
          per_page: 100,
          page,
        },
      });

      if (!Array.isArray(response.data)) {
        throw new Error("GitHub returned an invalid file list.");
      }

      for (const file of response.data) {
        filesByName.set(file.filename, {
          filename: file.filename,
          previousFilename: file.previous_filename || null,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch || null,
        });
      }

      hasNextPage = /rel="next"/.test(response.headers.link || "");

      if (!hasNextPage) break;
    }

    // Avoid combining pages fetched while the PR is changing.
    const { data: latestPr } = await axios.get(
      baseUrl,
      requestOptions
    );

    if (
      latestPr.head.sha !== pr.head.sha ||
      latestPr.base.sha !== pr.base.sha ||
      latestPr.changed_files !== pr.changed_files
    ) {
      return res.status(409).json({
        message:
          "The PR changed while its files were being fetched. " +
          "Please review it again.",
      });
    }

    const files = [...filesByName.values()];

    const metadata = {
      totalFiles: pr.changed_files,
      fetchedFiles: files.length,
      fetchComplete:
        !hasNextPage && files.length === pr.changed_files,
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
    };

    const review = await reviewCode(files, metadata);
    const reviewObject = JSON.parse(review);

    const existingReview = await Review.findOne({
      userId,
      owner,
      repo,
      prNumber,
    });

    await Review.create({
      userId,
      owner,
      repo,
      prNumber,
      title: pr.title,
      review: reviewObject,
    });

    // Retains your existing unique-PR counting behavior.
    if (!existingReview) {
      await User.findByIdAndUpdate(userId, {
        $inc: { totalReviews: 1 },
      });
    }

    return res.status(200).json({
      review: reviewObject,
    });
  } catch (error) {
    const upstreamStatus = error.response?.status;

    console.error("PR review failed:", {
      status: upstreamStatus || error.statusCode,
      message: error.message,
    });

    if (upstreamStatus === 404) {
      return res.status(404).json({
        message: "Repository or pull request was not found or is inaccessible.",
      });
    }

    if (upstreamStatus === 401) {
      return res.status(502).json({
        message:
          "GitHub rejected the server token. Check its validity.",
      });
    }

    if (upstreamStatus === 403 || upstreamStatus === 429) {
      return res.status(503).json({
        message:
          "GitHub denied access or an API limit was reached. " +
          "Check the server logs and try again later.",
      });
    }

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Unable to generate review. Please try again.",
      ...(error.coverage ? { coverage: error.coverage } : {}),
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