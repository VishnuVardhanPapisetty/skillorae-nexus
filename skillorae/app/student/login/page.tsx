"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase";

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
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
        if (!acknowledgedDataUse) {
          setError("Please confirm how your student information will be used.");
          return;
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signupError) {
          const message = signupError.message.toLowerCase();
          setError(
            message.includes("password")
              ? "Choose a stronger password with at least 8 characters."
              : message.includes("already")
                ? "This address may already have an account. Try signing in instead."
                : signupError.message,
          );
          return;
        }

        if (!data.user) {
          setError(
            "The account request could not be confirmed. Please try again.",
          );
          return;
        }

        if (data.session) {
          const { data: mapping, error: mappingError } = await supabase
            .from("student_users")
            .select("student_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (mappingError || !mapping) {
            await supabase.auth.signOut();
            setSuccess(
              "Your account was created, but it is not linked to a student record yet. Contact your faculty administrator to enable student access.",
            );
            return;
          }

          router.replace("/Dashboard");
          router.refresh();
          return;
        }

        setSuccess(
          "If this address is eligible, Supabase will send the next account step. If email confirmation is enabled, verify your address. A faculty administrator must link your account to a student record before student tools are available.",
        );
        return;
      }

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(
          loginError.message.toLowerCase().includes("invalid login credentials")
            ? "Email or password is incorrect. Check your details and try again."
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
        setError("Student profile not linked. Please contact your faculty.");
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
            ? "Sign in to access your student intelligence dashboard."
            : "Create an account to begin student access setup."}
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
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${mode === "login" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => switchMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${mode === "signup" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              minLength={mode === "signup" ? 8 : undefined}
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
                  Your profile details support personalized career guidance and
                  learning recommendations.
                </li>
                <li>
                  Academic information is read from your faculty-linked student
                  record.
                </li>
                <li>
                  Learning progress currently stays in this browser and is not
                  synced across devices.
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
