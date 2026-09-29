
import dotenv from "dotenv";    //load environment variables
dotenv.config({path : "./.env"});
import express from "express";  // build server using express
import cors from "cors";
import statsRoutes from "./routes/statsRoutes.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";

import ReviewJob from "./models/ReviewJob.js";
import Review from "./models/Review.js";
import { reviewQueue, queueConnection } from "./config/reviewQueue.js";
import githubAuthRoutes from "./routes/githubAuthRoutes.js";
import AuthLinkLimit from "./models/AuthLinkLimit.js";
import OAuthAttempt from "./models/OAuthAttempt.js";
import User from "./models/User.js";

const app = express();// app is your backend application
const PORT = process.env.PORT || 3000;

app.use(express.json({limit : "100kb"})); //parse json data -> js object

app.use(cors({
    origin: process.env.FRONTEND_URL,
}));

app.use("/api/auth", authRoutes);
app.use("/api" , dashboardRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/auth/github", githubAuthRoutes);

await connectDB();    //connect mongodb with backend
await Promise.all([ReviewJob.init(), Review.init(), User.init(),
  OAuthAttempt.init() , AuthLinkLimit.init(),
]);

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

app.use((error, req, res, next) => {
  console.error("API error:", error.name);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: "Server error. Please try again." });
});

const server = app.listen(PORT , (req, res) =>{
    console.log(`Server is listening on port ${PORT}`);
})

async function shutdown() {
  server.close();
  await reviewQueue.close();
  await queueConnection.quit();
}
process.on("SIGTERM", () => shutdown().finally(() => process.exit(0)));
