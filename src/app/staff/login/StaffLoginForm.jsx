"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

export default function StaffLoginForm({ from = "/staff", denied = false }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    denied ? "This account isn't on the staff list." : "",
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message || "sign-in failed");
        return;
      }
      router.replace(from || "/staff");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Staff sign-in</CardTitle>
        <CardDescription>
          Sign in with your staff email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
            aria-label="Email"
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
            aria-label="Password"
            required
          />
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" disabled={submitting || !email || !password}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
