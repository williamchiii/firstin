"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
    >
      Logout
    </button>
  );
}
