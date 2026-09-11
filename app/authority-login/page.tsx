"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthorityLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(
        "Invalid authority email or password."
      );

      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-white/[0.03] p-8">

        <div className="text-center">

          <div className="text-4xl">
            🔐
          </div>

          <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-cyan-400">
            AUTHORITY ACCESS
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            CivicPulse AI
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sign in to access the Authority Command Center.
          </p>

        </div>

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-4"
        >

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Authority Email"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "🔐 Authority Login"}
          </button>

        </form>

        <Link
          href="/"
          className="mt-5 block text-center text-sm text-slate-400 hover:text-cyan-400"
        >
          ← Back to Citizen Portal
        </Link>

      </div>

    </main>
  );
}