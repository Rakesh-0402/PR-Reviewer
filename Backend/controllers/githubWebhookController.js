import crypto from "node:crypto";
import AutomaticReview from "../models/AutomaticReview.js";
import { initialState } from "../services/reviewJobCore.js";

const ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);

function validSignature(req) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  const signature = req.get("x-hub-signature-256") || "";

  if (
    !secret ||
    !Buffer.isBuffer(req.body) ||
    !/^sha256=[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest();

  const received = Buffer.from(signature.slice(7), "hex");

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

export async function githubWebhook(req, res) {
  if (!process.env.GITHUB_APP_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Webhook is not configured." });
  }

  if (!validSignature(req)) {
    return res.status(401).json({ message: "Invalid webhook signature." });
  }

  let payload;

  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Invalid JSON." });
  }

  const event = req.get("x-github-event");

  if (event === "ping") {
    return res.status(200).json({ message: "Webhook connected." });
  }

  try {
    const installationId = payload.installation?.id;

    // Stop outstanding work after access is revoked.
    if (
      event === "installation" &&
      ["deleted", "suspend"].includes(payload.action) &&
      Number.isSafeInteger(installationId)
    ) {
      await AutomaticReview.updateMany(
        {
          installationId,
          stage: { $in: ["review", "publish"] },
        },
        {
          $set: {
            stage: "superseded",
            lastError: "GitHub App installation is unavailable.",
          },
        }
      );

      return res.sendStatus(200);
    }

    if (
      event === "installation_repositories" &&
      payload.action === "removed" &&
      Number.isSafeInteger(installationId)
    ) {
      const removed = (payload.repositories_removed || [])
        .map(repository => repository.id);

      await AutomaticReview.updateMany(
        {
          installationId,
          repositoryId: { $in: removed },
          stage: { $in: ["review", "publish"] },
        },
        {
          $set: {
            stage: "superseded",
            lastError: "Repository access was removed.",
          },
        }
      );

      return res.sendStatus(200);
    }

    if (event !== "pull_request") {
      return res.sendStatus(200);
    }

    const pr = payload.pull_request;
    const repository = payload.repository;

    if (
      !Number.isSafeInteger(installationId) ||
      !Number.isSafeInteger(repository?.id) ||
      !Number.isSafeInteger(pr?.number) ||
      typeof repository?.owner?.login !== "string" ||
      typeof repository?.name !== "string" ||
      typeof pr?.head?.sha !== "string" ||
      typeof pr?.base?.sha !== "string"
    ) {
      return res.status(400).json({ message: "Invalid PR event." });
    }

    if (!ACTIONS.has(payload.action) || pr.state !== "open" || pr.draft) {
      return res.sendStatus(200);
    }

    const identity = {
      installationId,
      repositoryId: repository.id,
      prNumber: pr.number,
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
    };

    try {
      await AutomaticReview.updateOne(
        identity,
        {
          $setOnInsert: {
            ...identity,
            owner: repository.owner.login,
            repo: repository.name,
            stage: "review",
            state: initialState(),
            nextRunAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        { upsert: true, runValidators: true }
      );
    } catch (error) {
      // Concurrent delivery of the same PR version.
      if (error.code !== 11000) throw error;
    }

    return res.status(202).json({ message: "Automatic review saved." });
  } catch (error) {
    console.error("GitHub webhook persistence failed:", error.name);

    return res.status(503).json({
      message: "Could not save webhook. Redelivery is required.",
    });
  }
}