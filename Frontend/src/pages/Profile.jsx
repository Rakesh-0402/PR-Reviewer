import { useEffect, useState } from "react";
import axios from "axios";
import { Bot, GitPullRequest, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(response.data.user);
      } catch (error) {
        console.error("Unable to fetch profile:", error);
      }
    }

    fetchProfile();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">
          Loading profile...
        </p>
      </div>
    );
  }

  const joinedDate = new Date(user.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 px-6 py-12 transition-colors">
      <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            ← Back to Dashboard
    </Link>
      <div className="max-w-3xl mx-auto">

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-8">

          {/* Header */}
          <div className="flex items-center gap-5">

            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot className="text-white" size={38} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>

              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {user.email}
              </p>
            </div>

          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-5 mt-10">

            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
              <GitPullRequest
                className="mx-auto text-blue-600 mb-3"
                size={25}
              />

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {user.totalReviews}
              </h2>

              <p className="text-gray-500 dark:text-gray-400 mt-1">
                PRs Reviewed
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
              <CalendarDays
                className="mx-auto text-blue-600 mb-3"
                size={25}
              />

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                Joined
              </h2>

              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {joinedDate}
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
