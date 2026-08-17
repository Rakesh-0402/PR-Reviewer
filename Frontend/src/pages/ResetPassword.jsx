import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { resetPasswordSchema } from "../schemas/resetPasswordSchema";

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        const result = resetPasswordSchema.safeParse({
            password,
            confirmPassword,
        });

        if (!result.success) {
            const validationErrors = {};

            result.error.issues.forEach((issue) => {
                validationErrors[issue.path[0]] = issue.message;
            });

            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setMessage("");
        setLoading(true);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`,
                { password }
            );

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to reset password"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="min-h-screen flex items-center justify-center
                       bg-gradient-to-br from-blue-50 via-white to-purple-50
                       dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
        >
            <div className="bg-white dark:bg-gray-900 rounded-2xl
                            shadow-xl p-8 w-full max-w-md">

                <h1 className="text-3xl font-bold text-center
                               text-gray-900 dark:text-gray-100 mb-2">
                    Reset Password
                </h1>

                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
                    Create a new password for your account.
                </p>

                <label
                    htmlFor="password"
                    className="text-gray-700 dark:text-gray-300"
                >
                    New Password
                </label>

                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300
                               dark:border-gray-700 dark:bg-gray-800
                               dark:text-white rounded-lg px-4 py-2 mt-1 mb-2
                               focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                />

                {errors.password && (
                    <p className="text-red-500 text-sm mb-3">
                        {errors.password}
                    </p>
                )}

                <label
                    htmlFor="confirmPassword"
                    className="text-gray-700 dark:text-gray-300"
                >
                    Confirm Password
                </label>

                <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300
                               dark:border-gray-700 dark:bg-gray-800
                               dark:text-white rounded-lg px-4 py-2 mt-1 mb-2
                               focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                />

                {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mb-3">
                        {errors.confirmPassword}
                    </p>
                )}

                {message && (
                    <p className="text-green-600 dark:text-green-400 text-sm mb-4">
                        {message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700
                               disabled:bg-gray-400 text-white py-2
                               rounded-lg transition"
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </button>
            </div>
        </form>
    );
}