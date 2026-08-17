import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!email) {
            toast.error("Please enter your email");
            return;
        }

        try {
            setLoading(true);

            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
                { email }
            );

            toast.success("If the email exists, a reset link has been sent.");
        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-800"
            >

                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                    Forgot Password?
                </h1>

                <p className="text-gray-500 dark:text-gray-400 text-center mt-3 mb-6">
                    Enter your email and we'll send you a password reset link.
                </p>

                <label
                    htmlFor="email"
                    className="text-gray-700 dark:text-gray-300"
                >
                    Email
                </label>

                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border border-gray-300 dark:border-gray-700
                               bg-white dark:bg-gray-800
                               text-gray-900 dark:text-white
                               rounded-lg px-4 py-2 mt-2 mb-6
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700
                               disabled:bg-gray-400
                               text-white py-2 rounded-lg transition"
                >
                    {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
                    Remember your password?

                    <Link
                        to="/login"
                        className="text-blue-600 dark:text-blue-400 font-semibold ml-2 hover:underline"
                    >
                        Login
                    </Link>
                </p>

            </form>
        </div>
    );
}