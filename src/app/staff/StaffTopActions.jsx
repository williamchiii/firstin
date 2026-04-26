"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

const actionClass =
  "inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm";

export default function StaffTopActions() {
  const router = useRouter();

  async function logout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/staff/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={logout} className={actionClass}>
        Log out
      </button>
      <Link href="/" className={actionClass}>
        Home
      </Link>
    </div>
  );
}
