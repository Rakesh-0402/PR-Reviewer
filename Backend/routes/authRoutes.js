import express from "express";
import {signup, login, forgotPassword, resetPassword, getMe} from "../controllers/authController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router(); //create router

router.post("/signup" , signup);
router.post("/login" , login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", auth, getMe);

export default router;