import React, { useId, useState } from "react";
import { animated as Animated } from "@react-spring/web";
import { useScaleIn, useFadeInUp, SpringIcon } from "../utils/animations";
import { LogIn, User, Lock, Eye, EyeOff, Check, AlertTriangle } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12 bg-slate-50">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/40 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl opacity-50" />
      </div>

      <Animated.div
        style={cardAnim}
        className="relative w-full max-w-[420px] bg-white/70 backdrop-blur-2xl rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white p-10 md:p-12"
      >
        <header className="flex flex-col items-center text-center mb-10">
          <SpringIcon className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white font-bold text-2xl shadow-xl shadow-emerald-200/50 mb-6 tracking-tighter">
            HC
          </SpringIcon>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-heading mb-2">
              Hope's Corner
            </h1>
            <p className="text-slate-500 text-[15px] font-medium leading-relaxed">
              Sign in to manage check-ins<br />
              <span className="text-slate-400 font-normal">Internal check-in portal</span>
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 text-sm text-red-600 bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor={usernameId}
              className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1"
            >
              {useFirebase ? "Email Address" : "Username"}
            </label>
            <div className="group relative transition-all">
              <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                id={usernameId}
                className="w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-2xl px-4 py-3.5 pl-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/30 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all text-[15px]"
                placeholder={useFirebase ? "name@hope.org" : "username"}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={passwordId}
              className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1"
            >
              Password
            </label>
            <div className="group relative transition-all">
              <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id={passwordId}
                className="w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-2xl px-4 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/30 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all text-[15px]"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer h-5 w-5 appearance-none rounded-md border-2 border-slate-200 bg-white checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                />
                <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none stroke-[3]" />
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                Remember this device
              </span>
            </label>
          </div>

          <Animated.button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full relative group disabled:cursor-not-allowed"
            style={ctaAnim}
          >
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-0 group-hover:opacity-15 transition-opacity rounded-2xl" />
            <div className="relative flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-slate-200/50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0">
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </div>
          </Animated.button>
        </form>

        <footer className="mt-12 text-center space-y-4">
          <div className="text-[13px] font-medium text-slate-400">
            Need access? <a href="mailto:admin@hopescorner.org" className="text-emerald-600 hover:text-emerald-700 transition-colors font-semibold">Contact Administrator</a>
          </div>
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-widest pt-4">
            © {new Date().getFullYear()} Hope's Corner
          </div>
        </footer>
      </Animated.div>
    </div>
  );
};

export default Login;
