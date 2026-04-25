import { createClient } from "@supabase/supabase-js";
import { scorePatient } from "@/lib/scorePatient.js";

// ESI-1 keywords duplicated here so the hard-stop check happens before
// scorePatient() is imported/executed — guarantees zero API latency on
// life-threatening presentations even if the scoring module has an import error.
const ESI_1_KEYWORDS = [
  "chest pain",
  "heart attack",
  "can't breathe",
  "not breathing",
  "stroke",
  "unconscious",
  "unresponsive",
  "severe bleeding",
  "seizure",
];

// Service-role client — never expose to the browser.
// The Supabase URL in env may include a /rest/v1 suffix from misconfiguration;
// strip it so the JS SDK can construct its own endpoint paths correctly.
function makeSupabaseServerClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "");
  // SUPABASE_SECRET_KEY is the service role key — grants full table access
  const key = process.env.SUPABASE_SECRET_KEY ?? "";
  return createClient(url, key);
}

// ── ESI-1 inline check ────────────────────────────────────────────────────────
function hasESI1Trigger(chief_complaint, symptoms) {
  const text = [
    chief_complaint ?? "",
    ...(Array.isArray(symptoms) ? symptoms : []),
  ]
    .join(" ")
    .toLowerCase();
  return ESI_1_KEYWORDS.find((kw) => text.includes(kw)) ?? null;
}

// ── POST /api/triage ─────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = makeSupabaseServerClient();
  let patientData;

  // ── 1. Parse request body ──────────────────────────────────────────────────
  try {
    patientData = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    name,
    age,
    language = "en",
    chief_complaint,
    symptoms = [],
    pain_level,
    symptom_duration,
    prior_conditions = [],
    medications = [],
    allergies = [],
    wearable = { hr: null, spo2: null },
  } = patientData;

  if (!name || !chief_complaint) {
    return Response.json(
      { ok: false, error: "name and chief_complaint are required" },
      { status: 400 }
    );
  }

  // ── 2. ESI-1 HARD-STOP — checked before scorePatient() ────────────────────
  // If triggered we skip AI entirely and insert a minimal emergency record.
  const hardStopTerm = hasESI1Trigger(chief_complaint, symptoms);

  let scoring;
  if (hardStopTerm) {
    // Build a hard-stop scoring object without calling scorePatient()
    scoring = {
      severity_score:        100,
      esi_score:             1,
      priority_level:        "immediate",
      wait_category:         "priority",
      red_flags:             [`Life-threatening keyword detected: "${hardStopTerm}"`],
      suspicious_flags:      [],
      confidence_score:      1.0,
      recommended_action:    "Immediate resuscitation bay — call for team now, do not delay",
      nurse_review_required: true,
      clinical_rationale:    `ESI-1 hard-stop triggered by "${hardStopTerm}". Patient requires immediate life-saving intervention.`,
      symptom_analysis:      null,
      history_analysis:      null,
    };
  } else {
    // ── 3. Run three-agent AI scoring ─────────────────────────────────────
    try {
      scoring = await scorePatient({
        name,
        age,
        chief_complaint,
        symptoms,
        pain_level,
        symptom_duration,
        prior_conditions,
        medications,
        allergies,
        wearable,
        language,
        arrival_time: new Date().toISOString(),
      });
    } catch (scoringError) {
      // Fail-safe: scoring failed but patient must still appear on the dashboard.
      // Insert with nurse_review_required=true so staff knows scoring is incomplete.
      console.error("[triage] scorePatient failed:", scoringError);
      scoring = {
        severity_score:        null,
        esi_score:             3,              // conservative middle ground
        priority_level:        "urgent",
        wait_category:         "urgent",
        red_flags:             [],
        suspicious_flags:      [],
        confidence_score:      0.1,
        recommended_action:    "Manual triage required — AI scoring unavailable",
        nurse_review_required: true,
        clinical_rationale:    "Automated scoring failed; nurse assessment required.",
        symptom_analysis:      null,
        history_analysis:      null,
      };
    }
  }

  // ── 4. Insert patient row — this is what triggers Supabase Realtime ───────
  // All arrays are stored as JSON strings (Supabase text column).
  // ESI score is stored server-side ONLY and is never returned to the patient.
  const now = new Date().toISOString();

  const row = {
    // Core intake fields
    name,
    language,
    arrival_time:          now,
    chief_complaint,
    symptoms:              JSON.stringify(Array.isArray(symptoms) ? symptoms : []),
    pain_level:            pain_level ?? null,

    // AI scoring fields
    esi_score:             scoring.esi_score,
    severity_score:        scoring.severity_score,
    red_flags:             JSON.stringify(scoring.red_flags),
    suspicious_flags:      JSON.stringify(scoring.suspicious_flags),
    confidence_score:      scoring.confidence_score,
    nurse_review_required: scoring.nurse_review_required,
    clinical_rationale:    scoring.clinical_rationale,
    symptom_analysis:      scoring.symptom_analysis
                             ? JSON.stringify(scoring.symptom_analysis)
                             : null,
    history_analysis:      scoring.history_analysis
                             ? JSON.stringify(scoring.history_analysis)
                             : null,

    // Extended patient data
    medications:           JSON.stringify(medications),
    allergies:             JSON.stringify(allergies),
    wearable_hr:           wearable?.hr ?? null,
    wearable_spo2:         wearable?.spo2 ?? null,

    // Queue / status
    wait_category:         scoring.wait_category,
    queue_position:        scoring.esi_score,
    recommended_action:    scoring.recommended_action ?? null,
    status:                "waiting",

    // Wearable URLs (populated by other services later)
    audio_url:             null,
    soap_pdf_url:          null,

    // Nurse override fields (null until a nurse acts)
    nurse_override:        null,
    override_by:           null,
    override_at:           null,
  };

  let insertedPatient;
  try {
    const { data, error } = await supabase
      .from("patients")
      .insert(row)
      .select("id, wait_category, status")
      .single();

    if (error) throw error;
    insertedPatient = data;
  } catch (dbError) {
    console.error("[triage] Supabase insert failed:", dbError);
    // Even if the DB write fails, return a graceful response so the patient UI
    // doesn't crash. The nurse will need to add them manually.
    return Response.json(
      {
        ok: false,
        error: "Failed to register patient. Please alert front desk immediately.",
        // Still safe to return wait_category — not clinically sensitive
        wait_category: scoring.wait_category,
        priority_level: scoring.priority_level,
      },
      { status: 503 }
    );
  }

  // ── 5. Return patient-safe response — ESI score is NEVER sent to client ───
  return Response.json(
    {
      ok:             true,
      patient_id:     insertedPatient.id,
      wait_category:  scoring.wait_category,   // "priority" | "urgent" | "standard"
      priority_level: scoring.priority_level,  // human-readable label for patient UI
    },
    { status: 201 }
  );
}
