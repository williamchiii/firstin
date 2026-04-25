import { validateIntake } from "@/lib/validate.js";
import { triage, esi1Trigger, buildEsi1Result } from "@/lib/triage.js";
import { scorePatient } from "@/lib/scorePatient.js";
import { jsonError, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http.js";
import { supabase } from "@/lib/supabase.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { ok, errors, normalized } = validateIntake(parsed.body);
  if (!ok) return jsonError(errors, 400);

  // 1. ESI-1 hard-stop: skip AI on life-threats
  const trigger = esi1Trigger(normalized);
  let scoring;
  let scoring_source;

  if (trigger) {
    scoring = buildEsi1Result(trigger);
    scoring_source = "esi1_hard_stop";
  } else {
    // 2. AI scoring with rule-based fallback
    try {
      scoring = await scorePatient(normalized);
      scoring_source = "ai";
    } catch (err) {
      console.error("[intake] scorePatient failed, falling back to rules:", err);
      scoring = triage(normalized);
      scoring_source = "rule_based_fallback";
    }
  }

  // shape that matches the `patients` Supabase table
  const patient = {
    name: normalized.name,
    language: normalized.language,
    patient_dob: normalized.patient_dob,
    chief_complaint: normalized.chief_complaint,
    symptoms: normalized.symptoms,
    pain_level: normalized.pain_level,
    esi_score: scoring.esi_score,
    red_flags: scoring.red_flags,
    clinical_rationale: scoring.clinical_rationale,
    status: "waiting",
    // id, arrival_time, queue_position will be set on insert
  };

  const { count, error: countError } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("status", "waiting")
    .lte("esi_score", patient.esi_score);

  if (countError) {
    console.error("supabase count error:", countError);
    return jsonError(countError.message, 500);
  }

  const { data: insertedPatient, error: insertError } = await supabase
    .from("patients")
    .insert({
      ...patient,
      queue_position: (count ?? 0) + 1,
    })
    .select()
    .single();

  if (insertError) {
    console.error("supabase insert error:", insertError);
    return jsonError(insertError.message, 500);
  }

  return jsonOk(
    {
      patient: insertedPatient,
      wait_category: scoring.wait_category,
      scoring_source,
    },
    201,
  );
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
