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
    <nav className="flex items-center justify-between gap-3 mb-8 w-full sticky top-0 z-50 bg-slate-900 py-4">

      {/* Logo + Dashboard */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">

        <div className="bg-black p-2 rounded-lg shrink-0">
          <Bot className="text-white" size={20} />
        </div>

        <div className="min-w-0">
          <h1 className="font-bold text-base sm:text-2xl text-gray-900 dark:text-white whitespace-nowrap">
            AI PR Reviewer
          </h1>

          <div className="hidden sm:flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </div>
        </div>

      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link
            to="/"
            className="
              p-2 sm:p-2.5 rounded-lg border
              border-gray-200 dark:border-gray-800
              bg-white dark:bg-gray-900
              text-gray-700 dark:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition
              "
            title="Home"
          >
        <House size={18} />
        </Link>

        {/* Profile */}
        {user && (
          <div className="relative" ref={profileRef}>

            {/* Profile Button */}
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="
                 flex items-center gap-2
                  px-2 sm:px-3 py-2
                  rounded-xl
                  border border-gray-200 dark:border-gray-800
                  bg-white dark:bg-gray-900
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  transition
              "
            >
              <UserCircle
                size={32}
                className="text-blue-600 shrink-0"
              />

              <div className="hidden sm:block text-left leading-tight">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user.name}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>

              <ChevronDown
                size={16}
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
                    w-56 sm:w-64
                    max-w-[calc(100vw-2rem)]
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