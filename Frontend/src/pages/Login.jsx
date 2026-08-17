import { useState } from "react";
import { loginSchema } from "../schemas/loginSchema";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    async function handleSubmit(e) {
        e.preventDefault();

        const result = loginSchema.safeParse({ email, password });

        if (!result.success) {
            const validationErrors = {};

            result.error.issues.forEach((issue) => {
                validationErrors[issue.path[0]] = issue.message;
            });

            setErrors(validationErrors);
            return;
        }

        setErrors({});

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/login`,
                { email, password }
            );

            localStorage.setItem("token", response.data.token);
            navigate("/dashboard");

        } catch (error) {
            setErrors({
                general:
                    error.response?.data?.message ||
                    "Login failed. Please try again.",
            });
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

                <h1 className="text-3xl font-bold mb-6 text-center
                               text-gray-900 dark:text-gray-100">
                    Welcome Back
                </h1>

                {errors.general && (
                    <p className="text-red-500 text-sm text-center mb-4">
                        {errors.general}
                    </p>
                )}

                <label
                    htmlFor="email"
                    className="text-gray-700 dark:text-gray-300"
                >
                    Email
                </label>

                <input
                    className="w-full border border-gray-300 dark:border-gray-700
                               dark:bg-gray-800 dark:text-white rounded-lg
                               px-4 py-2 mt-1 mb-2
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                {errors.email && (
                    <p className="text-red-500 text-sm mb-4">
                        {errors.email}
                    </p>
                )}

                <label
                    htmlFor="password"
                    className="text-gray-700 dark:text-gray-300"
                >
                    Password
                </label>

                <div className="relative mt-1">
                    <input
                        className="w-full border border-gray-300
                                   dark:border-gray-700 dark:bg-gray-800
                                   dark:text-white rounded-lg px-4 py-2 pr-12
                                   focus:outline-none focus:ring-2
                                   focus:ring-blue-500"
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-gray-500 hover:text-gray-700
                                   dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        {showPassword ? (
                            <EyeOff size={20} />
                        ) : (
                            <Eye size={20} />
                        )}
                    </button>
                </div>

                {errors.password && (
                    <p className="text-red-500 text-sm mt-1">
                        {errors.password}
                    </p>
                )}

                <div className="text-right mt-2 mb-6">
                    <Link
                        to="/forgot-password"
                        className="text-sm text-blue-600
                                   dark:text-blue-400 hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2
                               rounded-lg hover:bg-blue-700 transition"
                >
                    Login
                </button>

                <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
                    Don't have an account?
                    <Link
                        to="/signup"
                        className="text-blue-600 dark:text-blue-400
                                   font-semibold ml-2 hover:underline"
                    >
                        Sign up
                    </Link>
                </p>

            </div>
        </form>
    );
}