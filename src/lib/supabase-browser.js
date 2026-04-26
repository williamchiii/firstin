// Browser-side Supabase client (anon key). Used for auth on the staff pages.
//
// MUST use @supabase/ssr's createBrowserClient — it stores the session in
// cookies, which the proxy at src/proxy.js reads to gate /staff/*.
// createClient from @supabase/supabase-js uses localStorage; the proxy can't
// see localStorage, so signing in succeeds in the browser but the next request
// to /staff bounces back to /staff/login. Don't change this without also
// changing the proxy.

"use client";

import { createBrowserClient } from "@supabase/ssr";

let client;

export function getSupabaseBrowser() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  client = createBrowserClient(url, anonKey);
  return client;
}

// Backwards-compat: some teammates import the named instance directly.
// Proxy lazily delegates so module load doesn't throw before env is read.
export const supabaseBrowser = new Proxy(
  {},
  {
    get(_target, prop) {
      return Reflect.get(getSupabaseBrowser(), prop);
    },
  },
);
