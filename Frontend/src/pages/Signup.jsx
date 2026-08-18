import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupSchema } from "../schemas/signupSchema";
import axios from "axios";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();

    const result = signupSchema.safeParse({
      name,
      email,
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

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        {
          name,
          email,
          password,
        }
      );

      toast.success("Account created successfully!");

      navigate("/login");
    } catch (err) {
      console.log(err);

      toast.error(
        err.response?.data?.message || "Signup failed"
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen flex items-center justify-center px-4 sm:px-6
                 bg-gradient-to-br from-blue-50 via-white to-purple-50
                 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">

      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        Create Account</h1>

        {/* Name */}
      <label
        htmlFor="name"
        className="text-gray-700 dark:text-gray-300"
      >
      Full Name
      </label>

      <input
          className="w-full border border-gray-300 dark:border-gray-700
                     dark:bg-gray-800 dark:text-white rounded-lg
                     px-4 py-2 mt-1 mb-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {errors.name && (
          <p className="text-red-500 text-sm mb-4">
            {errors.name}
          </p>
        )}

        {/* Email */}
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

        {/* Password */}
        <label
          htmlFor="password"
          className="text-gray-700 dark:text-gray-300"
        >
          Password
        </label>

        <div className="relative mt-1">
          <input
            className="w-full border border-gray-300 dark:border-gray-700
                       dark:bg-gray-800 dark:text-white rounded-lg
                       px-4 py-2 pr-12
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {errors.password && (
          <p className="text-red-500 text-sm mt-1 mb-4">
            {errors.password}
          </p>
        )}

        {/* Confirm Password */}
        <label
          htmlFor="confirmPassword"
          className="text-gray-700 dark:text-gray-300"
        >
          Confirm Password
        </label>

        <div className="relative mt-1 mb-2">
          <input
            className="w-full border border-gray-300 dark:border-gray-700
                       dark:bg-gray-800 dark:text-white rounded-lg
                       px-4 py-2 pr-12
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-gray-500 hover:text-gray-700
                       dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mb-4">
            {errors.confirmPassword}
          </p>
        )}

        {/* Register */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2
                     rounded-lg hover:bg-blue-700 transition"
        >
          Register
        </button>

        {/* Login */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Already have an account?
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400
                       font-semibold ml-2 hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </form>
  );
}