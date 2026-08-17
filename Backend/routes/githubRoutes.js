import express from "express";
import { getPullRequestFiles, getPullRequests, getRepository} from "../controllers/githubController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/pulls" , getPullRequests);

router.get("/pulls/:owner/:repo/:pull_number/files" , 
    authenticateToken,
    getPullRequestFiles
);

router.get("/repository" , getRepository);

export default router;