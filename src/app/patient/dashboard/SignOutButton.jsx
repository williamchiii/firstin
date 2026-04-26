"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/patient/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm transition"
      style={{ color: "#94A3B8" }}
      onMouseEnter={(e) => (e.target.style.color = "#ffffff")}
      onMouseLeave={(e) => (e.target.style.color = "#94A3B8")}
    >
      Sign out
    </button>
  );
}
