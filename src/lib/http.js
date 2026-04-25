//api response helper to keep API responses consistent

import { NextResponse } from "next/server";

export function jsonError(errors, status = 400) {
  const list = Array.isArray(errors) ? errors : [String(errors)];
  return NextResponse.json({ ok: false, errors: list }, { status });
}

export function jsonOk(data, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function methodNotAllowed(allowed) {
  return NextResponse.json(
    { ok: false, errors: [`method not allowed; use ${allowed.join(", ")}`] },
    { status: 405, headers: { Allow: allowed.join(", ") } },
  );
}

export async function readJsonBody(req) {
  try {
    const body = await req.json();
    return { ok: true, body };
  } catch {
    return { ok: false, error: "invalid JSON body" };
  }
}
