import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Headphones,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react";

type Mode = "login" | "signup";
type Role = "Student" | "Faculty" | "Professional";

type StoredUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

const USERS_KEY = "LectureIQ_users";
const AUTH_KEY = "LectureIQ_auth";

function getUsers(): StoredUser[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export default function AuthPage({
  mode: initialMode = "login",
}: {
  mode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("Student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const roles: Role[] = ["Student", "Faculty", "Professional"];

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const users = getUsers();

        if (mode === "signup") {
          if (!name.trim()) {
            setMessage("Please enter your full name.");
            return;
          }

          if (password.length < 6) {
            setMessage("Password must contain at least 6 characters.");
            return;
          }

          if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
          }

          const existingUser = users.find(
            (user) => user.email === cleanEmail
          );

          if (existingUser) {
            setMessage(
              "An account with this email already exists. Please sign in."
            );
            return;
          }

          const newUser: StoredUser = {
            name: name.trim(),
            email: cleanEmail,
            password,
            role,
          };

          saveUsers([...users, newUser]);

          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify({
              isLoggedIn: true,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
            })
          );

          navigate("/dashboard");
          return;
        }

        const user = users.find(
          (item) => item.email === cleanEmail
        );

        if (!user) {
          setMessage(
            "No account found with this email. Please create an account first."
          );
          return;
        }

        if (user.password !== password) {
          setMessage("Incorrect password. Please try again.");
          return;
        }

        localStorage.setItem(
          AUTH_KEY,
          JSON.stringify({
            isLoggedIn: true,
            name: user.name,
            email: user.email,
            role: user.role,
          })
        );

        navigate("/dashboard");
      } catch (error) {
        console.error("Authentication error:", error);
        setMessage("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-full flex bg-white">
      {/* ================================================== */}
      {/* LEFT PANEL */}
      {/* ================================================== */}

      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex-col p-10 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <Link
          to="/"
          className="flex items-center gap-2.5 relative z-10"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Headphones size={16} className="text-white" />
          </div>

          <span
            className="text-[15px] font-semibold text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            LectureIQ
          </span>
        </Link>

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h2
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Transform audio into organized knowledge
          </h2>

          <p className="text-blue-100 text-[14px] leading-relaxed mb-8">
            Turn lecture recordings into structured notes, speaker-aware
            transcripts, key takeaways, exam points, and study flashcards.
          </p>

          <div className="space-y-3">
            {[
              "Whisper-powered transcription",
              "Speaker identification & diarization",
              "AI-powered lecture summaries",
              "Automatic exam points & flashcards",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ChevronRight
                    size={12}
                    className="text-white"
                  />
                </div>

                <span className="text-[13px] text-blue-100">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-blue-200 relative z-10">
          © 2026 LectureIQ
        </p>
      </div>

      {/* ================================================== */}
      {/* RIGHT PANEL */}
      {/* ================================================== */}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2 mb-6"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
                <Headphones
                  size={14}
                  className="text-white"
                />
              </div>

              <span
                className="text-[14px] font-semibold"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                LectureIQ{" "}
                <span className="text-[#5B6EF8]">
                  AI
                </span>
              </span>
            </Link>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            {(["login", "signup"] as Mode[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchMode(item)}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all capitalize ${
                    mode === item
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              )
            )}
          </div>

          <h1
            className="text-2xl font-bold text-slate-900 mb-1"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p className="text-[13px] text-slate-500 mb-6">
            {mode === "login"
              ? "Sign in to continue to LectureIQ"
              : "Create your account to start analyzing lectures"}
          </p>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* NAME */}
            {mode === "signup" && (
              <div>
                <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Your full name"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@university.edu"
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={
                    showPass ? "text" : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 placeholder:text-slate-300"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPass((current) => !current)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showPass
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPass ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            {mode === "signup" && (
              <div>
                <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={
                      showConfirmPass
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter your password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 placeholder:text-slate-300"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPass(
                        (current) => !current
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showConfirmPass
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPass ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ROLE */}
            {mode === "signup" && (
              <div>
                <label className="text-[12px] font-medium text-slate-700 mb-2 block">
                  I am a
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {roles.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${
                        role === item
                          ? "border-[#5B6EF8] bg-[#5B6EF8]/8 text-[#5B6EF8]"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ERROR / SUCCESS MESSAGE */}
            {message && (
              <div
                className={`rounded-xl px-3 py-2.5 text-[12px] ${
                  message.toLowerCase().includes("success")
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                    : "bg-red-50 border border-red-100 text-red-600"
                }`}
              >
                {message}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold py-3 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#5B6EF8]/25 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  {mode === "login"
                    ? "Signing in..."
                    : "Creating account..."}
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* MODE SWITCH */}
          <p className="text-center text-[12.5px] text-slate-500 mt-5">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
              className="text-[#5B6EF8] font-semibold hover:underline"
            >
              {mode === "login"
                ? "Create Account"
                : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
