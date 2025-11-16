import React, { useId, useState } from "react";
import { animated as Animated } from "@react-spring/web";
import { useScaleIn, useFadeInUp, SpringIcon } from "../utils/animations";
import { LogIn, User, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/useAuth";

const Login = () => {
  const { login, useFirebase } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const cardAnim = useScaleIn();
  const ctaAnim = useFadeInUp();
  const usernameId = useId();
  const passwordId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await Promise.resolve(login(username.trim(), password, { remember }));
    } catch (err) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.12),transparent_40%)]">
      <div className="absolute inset-0 pointer-events-none opacity-90 bg-gradient-to-b from-white/80 via-white to-emerald-50" />
      <Animated.div
        style={cardAnim}
        className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-100 p-8"
      >
        <header className="flex items-center gap-4 mb-6">
          <SpringIcon className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-blue-600 text-white font-bold text-xl shadow-lg">
            HC
          </SpringIcon>
          <div>
            <h1 className="text-2xl font-semibold text-emerald-800">
              Hope's Corner
            </h1>
            <p className="text-sm text-emerald-600">
              Staff & guest check-in portal
            </p>
            <p className="text-xs text-emerald-500 mt-1">Sign in to manage check-ins & schedules</p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 flex items-start gap-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
              />
            </svg>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={usernameId}
              className="block text-sm font-medium mb-1"
            >
              {useFirebase ? "Email" : "Username"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 w-10 flex items-center justify-center pointer-events-none text-emerald-500">
                <SpringIcon>
                  <User size={16} />
                </SpringIcon>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                id={usernameId}
                className="w-full border border-gray-200 rounded-md bg-gray-50 px-3 py-2 pl-12 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder={useFirebase ? "you@hope.org" : "username"}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 w-10 flex items-center justify-center pointer-events-none text-emerald-500">
                <SpringIcon>
                  <Lock size={16} />
                </SpringIcon>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id={passwordId}
                className="w-full border border-gray-200 rounded-md bg-gray-50 px-3 py-2 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Your secure password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-emerald-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <SpringIcon>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </SpringIcon>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-emerald-700">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Remember me
            </label>
            {/* Removed the 'Forgot?' / reset password option for a cleaner, professional login UX */}
          </div>

          <Animated.button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
            style={ctaAnim}
          >
            <LogIn size={18} />{" "}
            {loading ? "Signing in…" : "Sign In"}
          </Animated.button>
          <div className="mt-4 border-t border-gray-100 pt-3 text-center text-xs text-emerald-600">
            Need access? Contact your administrator.
          </div>
        </form>

        <footer className="mt-6 text-center text-xs text-emerald-700">
          <div>
            © {new Date().getFullYear()} Hope's Corner — Internal use only
          </div>
        </footer>
      </Animated.div>
    </div>
  );
};

export default Login;
