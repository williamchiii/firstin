import { NextResponse } from "next/server";
import { validateIntake } from "@/lib/validate.js";
import { triage } from "@/lib/triage.js";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["invalid JSON body"] },
      { status: 400 },
    );
  }

  const { ok, errors, normalized } = validateIntake(body);
  if (!ok) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const triageResult = triage(normalized);

  const patient = {
    id: crypto.randomUUID(),
    ...normalized,
    ...triageResult,
    status: "waiting",
    created_at: new Date().toISOString(),
  };

  // TODO: insert `patient` into Supabase here

  return NextResponse.json({ ok: true, patient }, { status: 201 });
}
