import { jsonError, jsonOk, readJsonBody } from "@/lib/http.js";
import { parseVoiceTranscript } from "@/lib/gemini.js";
import { scorePatient } from "@/lib/scorePatient.js";
import { triage } from "@/lib/triage.js";
import { ESI_TO_WAIT_CATEGORY } from "@/lib/constants.js";
import { supabase } from "@/lib/supabase.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { transcript, email } = parsed.body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return jsonError("transcript is required", 400);
  }

  // --- Parse transcript with Gemini (fallback to minimal data on failure) ---
  let parsedData;
  try {
    parsedData = await parseVoiceTranscript(transcript);
  } catch (err) {
    console.error("[finalize] parseVoiceTranscript failed, using fallback:", err);
    // Don't crash — save what we have so the patient still gets a queue position
    parsedData = {
      chiefComplaint: "Unknown — brief intake",
      symptoms: [],
      painLevel: null,
      duration: null,
      redFlags: [],
      demographics: null,
      emailMentioned: null,
    };
  }

  const { chiefComplaint, symptoms, painLevel, redFlags, demographics } = parsedData;
  const resolvedComplaint = chiefComplaint || "Unknown — brief intake";

  // --- Score patient (AI with rule-based fallback) ---
  const normalized = {
    name: demographics?.name ?? "Unknown",
    language: "en",
    chief_complaint: resolvedComplaint,
    symptoms: symptoms?.join(", ") ?? "",
    pain_level: painLevel ?? null,
    patient_dob: demographics?.dob ?? null,
  };

  let scoring;
  try {
    scoring = await scorePatient(normalized);
  } catch (err) {
    console.error("[finalize] scorePatient failed, falling back to rules:", err);
    scoring = triage(normalized);
  }

  // --- Queue position: count cases ahead with equal or better ESI ---
  const { count: aheadCount, error: countError } = await supabase
    .from("triage_cases")
    .select("*", { count: "exact", head: true })
    .eq("status", "waiting")
    .lte("esi_score", scoring.esi_score);

  if (countError) {
    console.error("[finalize] queue count error:", countError);
    return jsonError("Database error", 500);
  }

  const queuePosition = (aheadCount ?? 0) + 1;

  // --- Insert patient row ---
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      name: normalized.name,
      language: normalized.language,
      patient_dob: normalized.patient_dob,
      chief_complaint: resolvedComplaint,
      symptoms: normalized.symptoms,
      pain_level: normalized.pain_level,
      esi_score: scoring.esi_score,
      red_flags: scoring.red_flags,
      clinical_rationale: scoring.clinical_rationale,
      status: "waiting",
      queue_position: queuePosition,
      ...(email ? { email } : {}),
    })
    .select("id")
    .single();

  if (patientError) {
    console.error("[finalize] patient insert error:", patientError);
    return jsonError("Failed to save patient", 500);
  }

  // --- Insert triage case ---
  const { data: triageCase, error: caseError } = await supabase
    .from("triage_cases")
    .insert({
      patient_id: patient.id,
      transcript,
      parsed_json: parsedData,
      esi_score: scoring.esi_score,
      chief_complaint: resolvedComplaint,
      symptoms: symptoms ?? [],
      pain_level: painLevel ?? null,
      red_flags: Array.isArray(redFlags) ? redFlags : [],
      clinical_rationale: scoring.clinical_rationale,
      status: "waiting",
      queue_position: queuePosition,
    })
    .select("id")
    .single();

  if (caseError) {
    console.error("[finalize] triage_case insert error:", caseError);
    return jsonError("Failed to save triage case", 500);
  }

  return jsonOk(
    {
      caseId: triageCase.id,
      patientId: patient.id,
      esi: scoring.esi_score,
      waitCategory: ESI_TO_WAIT_CATEGORY[scoring.esi_score],
      queuePosition,
    },
    201,
  );
}
