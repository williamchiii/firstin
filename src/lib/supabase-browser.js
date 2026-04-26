// Browser-side Supabase client (anon key). Used for auth on the staff pages.
// Distinct from src/lib/supabase.js which uses the service role key server-side.

"use client";

import { createBrowserClient } from "@supabase/ssr";

let client;

export function getSupabaseBrowser() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  client = createBrowserClient(url, anonKey);
  return client;
}
