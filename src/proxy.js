// Next.js 16 "proxy" (formerly middleware). Gates /staff/* behind Supabase Auth
// AND the email allowlist. Runs on the Edge runtime, so no node:* modules.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/staff-allowlist.js";

function bounceToLogin(req, pathname, opts = {}) {
  const url = req.nextUrl.clone();
  url.pathname = "/staff/login";
  url.searchParams.set("from", pathname);
  if (opts.denied) url.searchParams.set("denied", "1");
  return NextResponse.redirect(url);
}

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const res = NextResponse.next({ request: req });

  // Refresh the session cookie on every matched request so it doesn't expire.
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser().catch(() => {});
  }

  // --- Staff gate ---
  if (pathname.startsWith("/staff") && pathname !== "/staff/login") {
    if (!url || !anonKey) {
      console.warn("[proxy] Supabase env not set — denying /staff");
      return bounceToLogin(req, pathname);
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    let user = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user ?? null;
    } catch (err) {
      console.warn("[proxy] auth.getUser failed:", err?.message);
      return bounceToLogin(req, pathname);
    }

    if (!user) return bounceToLogin(req, pathname);
    if (!isAllowedEmail(user.email)) return bounceToLogin(req, pathname, { denied: true });
  }

  return res;
}

export const config = {
  matcher: ["/staff/:path*", "/patient/:path*"],
};
