import express from "express";
import auth from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import GithubInstallation from "../models/GithubInstallation.js"
import { getPersonalInstallation } from "../services/githubAppService.js";

const router = express.Router();

router.use(auth);

function publicInstallation(installation) {
  if (!installation) return null;

  return {
    accountLogin: installation.accountLogin,
    repositorySelection: installation.repositorySelection,
    enabled: installation.enabled,
    verifiedAt: installation.verifiedAt,
  };
}

// Read the saved connection.
router.get("/", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const user = await User.findById(req.user.id)
      .select("githubId")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Please log in again." });
    }

    const installation = user.githubId
      ? await GithubInstallation.findOne({
          userId: user._id,
          githubId: user.githubId,
        }).lean()
      : null;

    return res.json({
      installation: publicInstallation(installation),
    });
  } catch {
    return res.status(503).json({
      message: "Unable to load automatic review settings.",
    });
  }
});

// Verify the GitHub installation and enable future PR events.
router.post("/connect", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const user = await User.findById(req.user.id)
      .select("githubId githubUsername")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Please log in again." });
    }

    if (!user.githubId || !user.githubUsername) {
      return res.status(400).json({
        message: "Connect your GitHub account first.",
      });
    }

    let installation;

    try {
      installation = await getPersonalInstallation(user.githubUsername);
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          message:
            "Installation not found. Install the app on your connected " +
            "personal GitHub account, then try again.",
        });
      }

      throw error;
    }

    if (
      !Number.isSafeInteger(installation.id) ||
      installation.account?.type !== "User" ||
      String(installation.account.id) !== String(user.githubId) ||
      String(installation.app_id) !== process.env.GITHUB_APP_ID?.trim()
    ) {
      return res.status(403).json({
        message:
          "This installation does not belong to your connected GitHub account.",
      });
    }

    if (installation.suspended_at) {
      return res.status(409).json({
        message: "Your GitHub App installation is suspended.",
      });
    }

    if (
      installation.permissions?.pull_requests !== "write" ||
      !installation.events?.includes("pull_request")
    ) {
      return res.status(409).json({
        message:
          "The app needs Pull requests: Read and write permission " +
          "and the Pull request event subscription.",
      });
    }

    const saved = await GithubInstallation.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          installationId: installation.id,
          githubId: String(user.githubId),
          accountLogin: installation.account.login,
          repositorySelection: installation.repository_selection,
          enabled: true,
          verifiedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      message: "Automatic reviews enabled.",
      installation: publicInstallation(saved),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This installation is already connected to another account.",
      });
    }

    console.error("Installation verification failed:", {
      type: error.name,
      status: error.response?.status,
    });

    return res.status(503).json({
      message: "Could not verify the installation. Please try again.",
    });
  }
});

export default router;