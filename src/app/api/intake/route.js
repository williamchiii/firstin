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

  // shape that matches the `patients` Supabase table
  const patient = {
    name: normalized.name,
    language: normalized.language,
    chief_complaint: normalized.chief_complaint,
    symptoms: normalized.symptoms,
    pain_level: normalized.pain_level,
    esi_score: triageResult.esi_score,
    red_flags: triageResult.red_flags,
    clinical_rationale: triageResult.clinical_rationale,
    status: "waiting",
    // id, arrival_time, queue_position will be set on insert
  };

  // TODO: insert `patient` into Supabase, set queue_position, return inserted row

  return NextResponse.json(
    { ok: true, patient, wait_category: triageResult.wait_category },
    { status: 201 },
  );
}
