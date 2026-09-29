import { useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import useTheme from "../hooks/useTheme";

const navLinks = [
  { name: "Features", id: "features" },
  { name: "How It Works", id: "how-it-works" },
  { name: "Pricing", id: "pricing" },
  { name: "About", id: "about" },
];

function hasActiveSession() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const decoded = jwtDecode(token);

    return Boolean(
      decoded.id &&
      typeof decoded.exp === "number" &&
      decoded.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}
export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = hasActiveSession();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav
      className="
        sticky top-0 z-50
        border-b border-gray-200 dark:border-gray-800
        bg-white/90 dark:bg-gray-950/90
        backdrop-blur-md
        transition-colors
      "
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Navbar */}
        <div className="h-20 flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            onClick={closeMenu}
            className="
              text-xl sm:text-2xl
              font-bold
              text-blue-600
              whitespace-nowrap
            "
          >
            AI PR Reviewer
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-7">

            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="
                  text-gray-600 dark:text-gray-300
                  hover:text-blue-600 dark:hover:text-blue-400
                  transition-colors
                  whitespace-nowrap
                "
              >
                {link.name}
              </a>
            ))}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="
                p-2.5 rounded-lg
                border border-gray-300 dark:border-gray-700
                bg-white dark:bg-gray-900
                text-gray-700 dark:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition
              "
            >
              {theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            {/* Login */}
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-white
                          hover:bg-blue-700 transition whitespace-nowrap"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-white
                            hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </>
            )}

          </div>

          {/* Mobile / Tablet Controls */}
          <div className="flex lg:hidden items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="
                p-2.5 rounded-lg
                border border-gray-300 dark:border-gray-700
                bg-white dark:bg-gray-900
                text-gray-700 dark:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition
              "
            >
              {theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="
                p-2.5 rounded-lg
                border border-gray-300 dark:border-gray-700
                bg-white dark:bg-gray-900
                text-gray-700 dark:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition
              "
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            className="
              lg:hidden
              border-t border-gray-200 dark:border-gray-800
              py-5
            "
          >
            <div className="flex flex-col gap-2">

              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={closeMenu}
                  className="
                    px-3 py-3 rounded-lg
                    text-gray-700 dark:text-gray-300
                    hover:bg-blue-50 dark:hover:bg-gray-900
                    hover:text-blue-600 dark:hover:text-blue-400
                    transition
                  "
                >
                  {link.name}
                </a>
              ))}

              <div className="border-t border-gray-200 dark:border-gray-800 my-2" />

              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="block w-full rounded-lg bg-blue-600 px-4 py-3
                            text-center text-white hover:bg-blue-700 transition"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="block rounded-lg px-3 py-3 text-gray-700
                              dark:text-gray-300 hover:bg-gray-100
                              dark:hover:bg-gray-900 transition"
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    onClick={closeMenu}
                    className="block rounded-lg bg-blue-600 px-4 py-3
                              text-center text-white hover:bg-blue-700 transition"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </nav>
  );
}