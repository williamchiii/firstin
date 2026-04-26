import { jsonError } from "@/lib/http.js";
import {
  buildConfirmationText,
  buildDischargeText,
  generateAudio,
} from "@/lib/elevenlabs.js";
import { ESI_TO_WAIT_CATEGORY } from "@/lib/constants.js";
import { supabase } from "@/lib/supabase.js";

// Normalize the short locale code stored in the DB to the key VOICE_MAP expects.
const LANG_NORMALIZE = {
  en: "english",
  es: "spanish",
  pt: "portuguese",
  vi: "vietnamese",
  ht: "haitian_creole",
};

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { patientId, type, recoveryInstructions } = body ?? {};

  if (!patientId) return jsonError("patientId is required", 400);
  if (!["confirmation", "discharge"].includes(type)) {
    return jsonError("type must be 'confirmation' or 'discharge'", 400);
  }
  if (type === "discharge" && !recoveryInstructions) {
    return jsonError("recoveryInstructions is required for discharge type", 400);
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .select("chief_complaint, esi_score, language")
    .eq("id", patientId)
    .single();

  if (error || !patient) return jsonError("Patient not found", 404);

  const language =
    LANG_NORMALIZE[patient.language] ?? patient.language ?? "english";
  const waitCategory = ESI_TO_WAIT_CATEGORY[patient.esi_score] ?? "urgent";
  const chiefComplaint = patient.chief_complaint || "your condition";

  const textResult =
    type === "confirmation"
      ? buildConfirmationText(waitCategory, chiefComplaint, language)
      : buildDischargeText(recoveryInstructions, language);

  if (!textResult.ok) return jsonError(textResult.error, 400);

  const audioResult = await generateAudio(textResult.text, language);
  if (!audioResult.ok) return jsonError(audioResult.error, 502);

  return new Response(audioResult.audioBuffer, {
    headers: {
      "Content-Type": audioResult.mimeType,
      "Cache-Control": "no-store",
    },
  });
}
