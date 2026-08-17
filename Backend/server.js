
import dotenv from "dotenv";    //load environment variables
dotenv.config({path : "./.env"});
import express from "express";  // build server using express
import cors from "cors";
import statsRoutes from "./routes/statsRoutes.js";

console.log(process.env.GROQ_API_KEY);

import connectDB from "./config/db.js";

const app = express();// app is your backend application
const port = process.env.PORT;

app.use(express.json()); //parse json data -> js object

app.use(cors({
    origin: process.env.FRONTEND_URL,
}));

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api" , dashboardRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/stats", statsRoutes);

connectDB();    //connect mongodb with backend

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});
app.listen(port , (req, res) =>{
    console.log(`Server is listening on port ${port}`);
})