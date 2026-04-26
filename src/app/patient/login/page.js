"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

export default function PatientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("Incorrect email or password. Check the email we sent you after your visit.");
        return;
      }
      router.push("/patient/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-8 flex flex-col gap-6"
        style={{ backgroundColor: "#0F172A", borderColor: "#1E293B" }}
      >
        {/* Logo */}
        <div>
          <span className="text-xl font-bold tracking-tight text-white">
            First<span className="text-blue-500">In</span>
          </span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-white">
            Access your visit summary
          </h1>
          <p className="text-sm text-slate-400">
            Use the login details sent to your email after your visit.
          </p>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-sm text-white placeholder-slate-500 outline-none transition
              focus:ring-2 focus:ring-blue-600"
            style={{ backgroundColor: "#0F172A", border: "1px solid #1E293B" }}
            aria-label="Email"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-sm text-white placeholder-slate-500 outline-none transition
              focus:ring-2 focus:ring-blue-600"
            style={{ backgroundColor: "#0F172A", border: "1px solid #1E293B" }}
            aria-label="Password"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSignIn}
          disabled={loading || !email || !password}
          className="h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white transition
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
