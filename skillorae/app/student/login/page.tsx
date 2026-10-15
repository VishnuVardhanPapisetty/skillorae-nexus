"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase";

export default function StudentLoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acknowledgedDataUse, setAcknowledgedDataUse] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setAcknowledgedDataUse(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const cleanName = fullName.trim();
        const cleanBranch = branch.trim();
        const cleanYear = year.trim();
        const cleanEmail = email.trim();

        if (
          cleanName.length < 2 ||
          cleanName.length > 100 ||
          cleanBranch.length < 2 ||
          cleanBranch.length > 80 ||
          !["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(cleanYear)
        ) {
          setError("Please enter a valid name, branch, and academic year.");
          return;
        }

        if (password.length < 8) {
          setError("Password must contain at least 8 characters.");
          return;
        }

        if (!acknowledgedDataUse) {
          setError("Please confirm how your student information will be used.");
          return;
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              branch: cleanBranch,
              year: cleanYear,
            },
          },
        });

        if (signupError) {
          const message = signupError.message.toLowerCase();

          setError(
            message.includes("rate limit")
              ? "Too many signup attempts. Please wait before trying again."
              : message.includes("password")
                ? "Choose a stronger password with at least 8 characters."
                : message.includes("already")
                  ? "This email may already have an account. Try signing in."
                  : signupError.message,
          );
          return;
        }

        if (!data.user) {
          setError(
            "Account creation could not be confirmed. Please try again.",
          );
          return;
        }

        const { data: mapping, error: mappingError } = await supabase
          .from("student_users")
          .select("student_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (mappingError) {
          setError(
            "Your account was created, but we could not verify your student profile. Please try signing in.",
          );
          return;
        }

        if (!mapping) {
          setSuccess(
            "Your account was created, but your student profile is not ready yet. Please try signing in again shortly.",
          );
          return;
        }

        if (!data.session) {
          setSuccess(
            "Your account and student profile are ready. Please sign in to continue.",
          );
          setMode("login");
          setPassword("");
          return;
        }

        router.replace("/Dashboard");
        router.refresh();
        return;
      }

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        const message = loginError.message.toLowerCase();

        setError(
          message.includes("invalid login credentials")
            ? "Email or password is incorrect. Check your details and try again."
            : message.includes("email not confirmed")
              ? "Your email is not confirmed. Please complete the required email verification."
              : loginError.message,
        );
        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        return;
      }

      const { data: mapping, error: mappingError } = await supabase
        .from("student_users")
        .select("student_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (mappingError || !mapping) {
        await supabase.auth.signOut();
        setError(
          "Your student profile could not be found. Please contact support.",
        );
        return;
      }

      router.replace("/Dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
          NEXUS
        </p>

        <h1 className="text-3xl font-bold">
          {mode === "login" ? "Student sign in" : "Create student account"}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in to access your student dashboard."
            : "Create your account and start your learning journey."}
        </p>

        <div
          className="mt-6 grid grid-cols-2 rounded-xl border border-white/10 bg-slate-950 p-1"
          role="group"
          aria-label="Account access"
        >
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => switchMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              mode === "login"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => switchMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              mode === "signup"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {mode === "signup" && (
            <>
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="branch" className="mb-2 block text-sm">
                  Branch
                </label>
                <input
                  id="branch"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. CSM, CSE, ECE"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="year" className="mb-2 block text-sm">
                  Academic year
                </label>
                <select
                  id="year"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Select your year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signup"
                  ? "At least 8 characters"
                  : "Enter your password"
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-slate-200">
                Information use
              </p>

              <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
                <li>
                  Your name, branch, and year create your student profile.
                </li>
                <li>
                  Your profile supports personalized learning and career
                  recommendations.
                </li>
                <li>
                  Academic records are accessed only through your authorized
                  student profile.
                </li>
                <li>
                  Learning progress may remain browser-local until server-side
                  synchronization is implemented.
                </li>
              </ul>

              <label className="flex items-start gap-3 border-t border-white/10 pt-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={acknowledgedDataUse}
                  onChange={(event) =>
                    setAcknowledgedDataUse(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  required
                />
                <span>
                  I understand how my profile and linked academic information
                  are used in NEXUS.
                </span>
              </label>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-200"
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "signup" && !acknowledgedDataUse)}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Student access · NEXUS Student Intelligence
        </p>
      </div>
    </main>
  );
}
