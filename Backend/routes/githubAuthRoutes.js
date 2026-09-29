import express from "express";
import auth from "../middleware/authMiddleware.js";
import { beginGithubLogin, finishGithubLogin, beginGithubLink, finishGithubLink } from "../controllers/githubAuthController.js";
const router = express.Router();
router.post("/start", beginGithubLogin);
router.post("/exchange", finishGithubLogin);
router.post("/link/start", auth, beginGithubLink);
router.post("/link/exchange", auth, finishGithubLink);
export default router;
