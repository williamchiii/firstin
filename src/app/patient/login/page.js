"use client";

import Link from "next/link";
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(messageForAuthError(authError));
        return;
      }

      if (!data.user?.user_metadata?.patient_id) {
        await supabase.auth.signOut();
        setError(
          "This account is not connected to a patient visit yet. Please contact staff for access.",
        );
        return;
      }

      router.push("/patient/dashboard");
    } catch {
      setError("We could not sign you in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] text-neutral-900">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-[3.25rem]">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
        >
          Home
        </Link>
      </div>

      <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-4 overflow-hidden rounded-xl bg-white py-4 text-sm text-neutral-900 shadow-sm ring-1 ring-neutral-900/10">
          <div className="grid auto-rows-min gap-1 px-4">
            <h1 className="text-base font-medium leading-snug text-neutral-900">
              Patient sign-in
            </h1>
            <p className="text-sm text-neutral-500">
              Sign in to view your visit summary and care instructions.
            </p>
          </div>

          <div className="flex flex-col gap-3 px-4">
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              aria-label="Email"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              aria-label="Password"
            />

            {error && (
              <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading || !email || !password}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-900 bg-neutral-900 px-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function messageForAuthError(error) {
  const message = `${error?.message ?? ""}`.toLowerCase();

  if (
    message.includes("email not confirmed") ||
    message.includes("not confirmed") ||
    message.includes("not verified")
  ) {
    return "This account has not been validated yet. Please confirm your email or ask staff to verify your account.";
  }

  return "Incorrect email or password. Check the email we sent you after your visit.";
}
