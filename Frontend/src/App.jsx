import { Routes, Route, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import GithubCallback from "./pages/GithubCallback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import useTheme from "./hooks/useTheme";
import { useEffect, useReducer } from "react";

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
function useActiveSession() {
  const [, refresh] = useReducer(count => count + 1, 0);

  useEffect(() => {
    const recheck = () => refresh();

    const onStorage = event => {
      if (event.key === "token" || event.key === null) {
        recheck();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        recheck();
      }
    };

    window.addEventListener("pageshow", recheck);
    window.addEventListener("focus", recheck);
    window.addEventListener("auth-changed", recheck);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("auth-changed", recheck);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return hasActiveSession();
}
function ProtectedRoute({ children }) {
  const authenticated = useActiveSession();

  return authenticated
    ? children
    : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const authenticated = useActiveSession();

  return authenticated
    ? <Navigate to="/dashboard" replace />
    : children;
}

export default function App() {
  useTheme();

  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <GuestRoute>
            <Signup />
          </GuestRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route
  path="/auth/github/callback"
  element={<GithubCallback />}
/>
    </Routes>
  );
}