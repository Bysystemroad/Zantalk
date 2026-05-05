"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { LogoMark } from "@/components/logo-mark";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const result = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (isSignup && !result.data.session) {
      setMessage("Check your email to confirm your Zantalk account.");
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
      <LogoMark size={42} />
      <section className="flex flex-1 flex-col justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-blue-100">
          {isSignup ? "Create account" : "Welcome back"}
        </p>
        <h1 className="text-4xl font-semibold text-white">
          {isSignup ? "Start capturing tasks." : "Open your voice dashboard."}
        </h1>

        <form onSubmit={submit} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-[8px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-200/60"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Password
            <input
              required
              minLength={6}
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-[8px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-200/60"
            />
          </label>

          {error ? (
            <p className="rounded-[8px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-[8px] border border-blue-300/20 bg-blue-300/10 px-4 py-3 text-sm text-blue-100">
              {message}
            </p>
          ) : null}

          <button
            disabled={loading}
            className="tap-highlight rounded-[8px] bg-white px-5 py-4 text-base font-bold text-slate-950 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Working..." : isSignup ? "Sign up" : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isSignup ? "Already have an account?" : "New to Zantalk?"}{" "}
          <Link
            href={isSignup ? "/login" : "/auth/signup"}
            className="font-semibold text-blue-100"
          >
            {isSignup ? "Login" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}
