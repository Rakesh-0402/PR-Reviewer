import "dotenv/config";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export async function signup(req, res){
    const{name, email, password} = req.body;  //destructing the object

    //check if user already exist
    const existingUser =await User.findOne({email});

    if(existingUser) {
        return res.status(400).json({
            message : "User already exist"
        });
    }
    //hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    //create a new user
    const newUser = new User({
        name,
        email,
        password : hashedPassword,
    });

    await newUser.save();  //save to mongodb

    res.status(201).json({     //sends response
        message : "User registered successfully"
    });
}

export async function login(req, res) {
    const {email, password} = req.body;

    //check user is already registered or not
    const userExist = await User.findOne({email});

    if(!userExist){
        return res.status(404).json({
            message : "User does not exist. Please sign up first"
        });
    }
    //bcrypt.compare() is asynchronous
    const isMatch =  await bcrypt.compare(password, userExist.password);
    if(!isMatch){
        return res.status(401).json({
            message : "Incorrect Password"
        });
    }
    //after successful login, generate token
    const token = jwt.sign(
        {id : userExist._id},
        process.env.JWT_SECRET,
        {expiresIn : "1d"}
    );

    res.status(200).json({     //sends response and token
        message : "Login successful",
        token,
    });
}
export async function forgotPassword(req, res) {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        // Don't reveal whether an account exists
        if (!user) {
            return res.status(200).json({
                message: "If an account exists, a password reset link has been sent.",
            });
        }

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = resetToken;

        // Token valid for 15 minutes
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        const resetLink =
            `http://localhost:5173/reset-password/${resetToken}`;
        
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Reset your AI PR Reviewer password",
            html: `
                <h2>Password Reset</h2>
                <p>You requested a password reset.</p>
                <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
            `,
        });

        return res.status(200).json({
            message:
                "If an account exists, a password reset link has been sent.",
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Unable to process password reset request",
        });
    }
}
export async function resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                message: "Reset link is invalid or expired",
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;

        // Invalidate token after successful reset
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            message: "Password reset successful",
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Unable to reset password",
        });
    }
}
export async function getMe(req, res) {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                totalReviews: user.totalReviews,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        console.error("Get profile error:", err);

        return res.status(500).json({
            message: "Unable to fetch profile",
        });
    }
}