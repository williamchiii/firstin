import { jsonError, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http.js";
import { generateSOAPNote } from "@/lib/gemini.js";
import { supabase } from "@/lib/supabase.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { patient_id, patient: patientPayload } = parsed.body;

  let patientData = patientPayload ?? null;

  if (!patientData && patient_id) {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, chief_complaint, symptoms, pain_level, esi_score, red_flags, clinical_rationale, status, arrival_time")
      .eq("id", patient_id)
      .single();

    if (error || !data) return jsonError("patient not found", 404);
    patientData = data;
  }

  if (!patientData) return jsonError("patient or patient_id is required", 400);

  try {
    const note = await generateSOAPNote(patientData);
    return jsonOk({ report: note });
  } catch (err) {
    console.error("[report] generateSOAPNote failed:", err);
    return jsonError("upstream AI error", 502);
  }
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
