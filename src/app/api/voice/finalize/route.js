import { jsonError, jsonOk, readJsonBody } from "@/lib/http.js";
import { parseVoiceTranscript } from "@/lib/gemini.js";
import { scorePatient } from "@/lib/scorePatient.js";
import { triage } from "@/lib/triage.js";
import { ESI_TO_WAIT_CATEGORY } from "@/lib/constants.js";
import { supabase } from "@/lib/supabase.js";

// Convert natural-language dates (e.g. "February 10th, 2002") to ISO YYYY-MM-DD.
function toIsoDate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { transcript, email } = parsed.body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return jsonError("transcript is required", 400);
  }

  console.log("[finalize] transcript length:", transcript.length, "chars");
  console.log("[finalize] transcript preview:\n", transcript.slice(0, 400));

  // --- Parse transcript with Gemini (fallback to minimal data on failure) ---
  let parsedData;
  try {
    parsedData = await parseVoiceTranscript(transcript);
    console.log("[finalize] Gemini parsed:", JSON.stringify(parsedData));
  } catch (err) {
    console.error("[finalize] parseVoiceTranscript failed, using fallback:", err);
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
  const resolvedComplaint = chiefComplaint?.trim() || "Unknown — brief intake";

  // --- Score patient (AI with rule-based fallback) ---
  const normalized = {
    name: demographics?.name?.trim() || "Unknown",
    language: "en",
    chief_complaint: resolvedComplaint,
    symptoms: Array.isArray(symptoms) ? symptoms.join(", ") : (symptoms ?? ""),
    pain_level: typeof painLevel === "number" ? Math.round(painLevel) : null,
    patient_dob: toIsoDate(demographics?.dob),
  };

  console.log("[finalize] normalized patient:", JSON.stringify(normalized));

  let scoring;
  try {
    scoring = await scorePatient(normalized);
  } catch (err) {
    console.error("[finalize] scorePatient failed, falling back to rules:", err);
    scoring = triage(normalized);
  }

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
      arrival_time: new Date().toISOString(),
      ...(email ? { email } : {}),
    })
    .select("id")
    .single();

  if (patientError) {
    console.error("[finalize] patient insert error:", patientError.message, patientError.details, patientError.hint);
    return jsonError(`Failed to save patient: ${patientError.message}`, 500);
  }

  // Derive real queue position from the patients table — same source as /api/queue,
  // so the confirmation screen and the status page always show the same number.
  const { data: queueRows } = await supabase
    .from("patients")
    .select("id")
    .in("status", ["waiting", "in_progress"])
    .order("esi_score", { ascending: true })
    .order("arrival_time", { ascending: true });

  const queuePosition = Math.max(1, (queueRows ?? []).findIndex((r) => r.id === patient.id) + 1);

  // --- Insert triage case (non-fatal — patient is already queued via patients row) ---
  const { data: triageCase, error: caseError } = await supabase
    .from("triage_cases")
    .insert({
      patient_id: patient.id,
      transcript,
      parsed_json: parsedData,
      esi_score: scoring.esi_score,
      chief_complaint: resolvedComplaint,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      pain_level: painLevel ?? null,
      red_flags: Array.isArray(redFlags) ? redFlags : [],
      clinical_rationale: scoring.clinical_rationale,
      status: "waiting",
      queue_position: queuePosition,
    })
    .select("id")
    .single();

  if (caseError) {
    console.error("[finalize] triage_case insert error (non-fatal):", caseError.message);
  }

  return jsonOk(
    {
      caseId: triageCase?.id ?? patient.id,
      patientId: patient.id,
      esi: scoring.esi_score,
      waitCategory: ESI_TO_WAIT_CATEGORY[scoring.esi_score],
      queuePosition,
    },
    201,
  );
}
