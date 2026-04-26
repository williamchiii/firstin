// Browser-side Supabase client — uses anon key, subject to RLS.
// Safe to import from client components and pages.
// Do NOT use for server-side operations — use src/lib/supabase.js (service role) instead.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
