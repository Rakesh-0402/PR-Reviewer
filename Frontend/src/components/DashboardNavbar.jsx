import {
  Bot,
  LayoutDashboard,
  LogOut,
  UserCircle,
  ChevronDown,
  User,
  House,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function DashboardNavbar() {
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");

        if (!token) return;

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
        console.error("Unable to fetch user:", error);
      }
    }

    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return (
    <nav className="flex items-center justify-between mb-8">

      {/* Logo + Dashboard */}
      <div className="flex items-center gap-3">

        <div className="bg-black p-2 rounded-lg">
          <Bot className="text-white" size={22} />
        </div>

        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">
            AI PR Reviewer
          </h1>

          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </div>
        </div>

      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <Link
            to="/"
            className="p-2.5 rounded-lg border
                      border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-900
                      text-gray-700 dark:text-gray-200
                      hover:bg-gray-100 dark:hover:bg-gray-800
                      transition"
            title="Home"
          >
        <House size={19} />
        </Link>

        {/* Profile */}
        {user && (
          <div className="relative" ref={profileRef}>

            {/* Profile Button */}
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="
                flex items-center gap-3
                px-3 py-2
                rounded-xl
                border border-gray-200 dark:border-gray-800
                bg-white dark:bg-gray-900
                hover:bg-gray-50 dark:hover:bg-gray-800
                transition
              "
            >
              <UserCircle
                size={34}
                className="text-blue-600"
              />

              <div className="hidden sm:block text-left leading-tight">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user.name}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>

              <ChevronDown
                size={17}
                className={`
                  text-gray-500
                  transition-transform
                  ${profileOpen ? "rotate-180" : ""}
                `}
              />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div
                className="
                  absolute right-0 mt-2
                  w-64
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-800
                  rounded-xl
                  shadow-xl
                  overflow-hidden
                  z-50
                "
              >

                {/* User Information */}
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">

                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>

                </div>

                {/* Profile */}
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="
                    w-full
                    flex items-center gap-3
                    px-4 py-3
                    text-left
                    text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    transition
                  "
                >
                  <User size={17} />
                  <span>Profile</span>
                </Link>

                {/* Logout */}
                <div className="border-t border-gray-200 dark:border-gray-800">

                  <button
                    onClick={logout}
                    className="
                      w-full
                      flex items-center gap-3
                      px-4 py-3
                      text-left
                      text-red-500
                      hover:bg-red-50 dark:hover:bg-red-950/30
                      transition
                    "
                  >
                    <LogOut size={17} />
                    <span>Logout</span>
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

    </nav>
  );
}