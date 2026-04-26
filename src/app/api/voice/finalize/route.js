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

const SYMPTOM_KEYWORDS = [
  "pain", "fever", "cough", "headache", "nausea", "vomit", "dizziness",
  "dizzy", "bleed", "breathing", "breath", "chest", "swelling", "rash",
  "fatigue", "tired", "weak", "sore", "throat", "stomach", "back", "arm",
  "leg", "head", "ear", "eye", "nose", "skin", "heart", "pounding", "racing",
];

const RED_FLAG_KEYWORDS = [
  "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
  "unconscious", "unresponsive", "severe bleeding", "stroke", "seizure",
  "heart attack", "allergic reaction", "anaphylaxis", "overdose",
];

/**
 * Always-available deterministic extractor — never throws, merges with Gemini output.
 * Gemini values win when non-empty; this fills in the gaps.
 */
function extractFromTranscript(transcript) {
  const patientLines = [];
  for (const line of transcript.split("\n")) {
    const m = line.match(/^Patient:\s*(.+)/i);
    if (m && m[1].trim().length >= 3) patientLines.push(m[1].trim());
  }

  // chiefComplaint — first substantive patient lines joined
  const meaningfulLines = patientLines.filter((l) => l.length >= 10);
  const chiefComplaint = meaningfulLines.slice(0, 2).join(". ") || patientLines.slice(0, 2).join(". ") || "";

  // symptoms — keyword scan across all patient lines
  const fullPatientText = patientLines.join(" ").toLowerCase();
  const symptoms = SYMPTOM_KEYWORDS.filter((kw) => fullPatientText.includes(kw));

  // painLevel — "X out of 10" or "X/10"
  let painLevel = null;
  const painMatch = transcript.match(/\b([0-9]|10)\s*(?:out of|\/)\s*10\b/i);
  if (painMatch) painLevel = parseInt(painMatch[1], 10);

  // redFlags — keyword scan on full transcript
  const lower = transcript.toLowerCase();
  const redFlags = RED_FLAG_KEYWORDS.filter((kw) => lower.includes(kw));

  // demographics.name — agent addressing patient
  let name = null;
  const nameMatch = transcript.match(
    /(?:(?:Mr|Ms|Mrs|Dr)\.?\s+)([\w][A-Za-z\s]{1,25}?)(?:\.|,|!|\?|\n)/,
  ) || transcript.match(/(?:Thank you,?\s+)([\w][A-Za-z\s]{2,25}?)(?:\.|,|!|\n)/i);
  if (nameMatch) name = nameMatch[1].trim();

  // dob — various date patterns spoken aloud
  let dob = null;
  const dobMatch = transcript.match(
    /(?:born|birthday|date of birth)[^\d]*(\w+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i,
  );
  if (dobMatch) dob = dobMatch[1];

  return { chiefComplaint, symptoms, painLevel, redFlags, demographics: name || dob ? { name, dob, age: null } : null };
}

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { transcript, email } = parsed.body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return jsonError("transcript is required", 400);
  }

  console.log("[finalize] transcript length:", transcript.length, "chars");
  console.log("[finalize] transcript preview:\n", transcript.slice(0, 500));

  // --- Deterministic extraction (always runs, never throws) ---
  const regexData = extractFromTranscript(transcript);
  console.log("[finalize] regex extracted:", JSON.stringify(regexData));

  // --- Parse transcript with Gemini (best-effort, merged with regex) ---
  let geminiData = null;
  try {
    geminiData = await parseVoiceTranscript(transcript);
    console.log("[finalize] Gemini parsed:", JSON.stringify(geminiData));
  } catch (err) {
    console.error("[finalize] parseVoiceTranscript failed, using regex only:", err.message);
  }

  // Merge — Gemini wins when non-empty, regex fills gaps
  const chiefComplaint =
    geminiData?.chiefComplaint?.trim() ||
    regexData.chiefComplaint ||
    "Unknown — brief intake";

  const symptoms = (() => {
    const g = Array.isArray(geminiData?.symptoms) ? geminiData.symptoms.filter(Boolean) : [];
    const r = regexData.symptoms ?? [];
    return g.length > 0 ? g : r;
  })();

  const painLevel = geminiData?.painLevel ?? regexData.painLevel ?? null;

  const redFlags = (() => {
    const g = Array.isArray(geminiData?.redFlags) ? geminiData.redFlags.filter(Boolean) : [];
    const r = regexData.redFlags ?? [];
    return g.length > 0 ? g : r;
  })();

  const demographics = (() => {
    const g = geminiData?.demographics;
    const r = regexData.demographics;
    if (!g && !r) return null;
    return {
      name: g?.name?.trim() || r?.name || null,
      dob: g?.dob || r?.dob || null,
      age: g?.age ?? r?.age ?? null,
    };
  })();

  console.log("[finalize] merged data:", JSON.stringify({ chiefComplaint, symptoms, painLevel, redFlags, demographics }));

  // --- Score patient (AI with rule-based fallback) ---
  const normalized = {
    name: demographics?.name?.trim() || "Unknown",
    language: "en",
    chief_complaint: chiefComplaint,
    symptoms: symptoms.join(", "),
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
      chief_complaint: chiefComplaint,
      symptoms: symptoms.length > 0 ? JSON.stringify(symptoms) : normalized.symptoms,
      pain_level: normalized.pain_level,
      esi_score: scoring.esi_score,
      red_flags: redFlags.length > 0 ? JSON.stringify(redFlags) : null,
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

  // Derive real queue position from the patients table — same source as /api/queue
  const { data: queueRows } = await supabase
    .from("patients")
    .select("id")
    .in("status", ["waiting", "in_progress"])
    .order("esi_score", { ascending: true })
    .order("arrival_time", { ascending: true });

  const queuePosition = Math.max(1, (queueRows ?? []).findIndex((r) => r.id === patient.id) + 1);

  // --- Insert triage case (non-fatal) ---
  const { data: triageCase, error: caseError } = await supabase
    .from("triage_cases")
    .insert({
      patient_id: patient.id,
      transcript,
      parsed_json: { chiefComplaint, symptoms, painLevel, redFlags, demographics },
      esi_score: scoring.esi_score,
      chief_complaint: chiefComplaint,
      symptoms,
      pain_level: painLevel ?? null,
      red_flags: redFlags,
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
