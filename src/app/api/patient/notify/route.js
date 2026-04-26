import { jsonError, jsonOk, readJsonBody } from "@/lib/http.js";
import { sendTriageConfirmation } from "@/lib/email.js";
import { ESI_TO_WAIT_CATEGORY } from "@/lib/constants.js";
import { supabase } from "@/lib/supabase.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { caseId, patientId, email } = parsed.body;

  if (!caseId || !patientId || !email) {
    return jsonError("caseId, patientId, and email are required", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Invalid email address", 400);
  }

  // Fetch triage case for ESI + queue position
  const { data: triageCase, error: fetchError } = await supabase
    .from("triage_cases")
    .select("esi_score, queue_position")
    .eq("id", caseId)
    .single();

  if (fetchError || !triageCase) {
    console.error("[notify] case fetch error:", fetchError);
    return jsonError("Case not found", 404);
  }

  // Persist email on patient row (non-fatal if it fails)
  const { error: updateError } = await supabase
    .from("patients")
    .update({ email })
    .eq("id", patientId);

  if (updateError) {
    console.error("[notify] patient email update error:", updateError);
  }

  // Send confirmation email
  try {
    await sendTriageConfirmation({
      to: email,
      esi: triageCase.esi_score,
      waitCategory: ESI_TO_WAIT_CATEGORY[triageCase.esi_score],
      queuePosition: triageCase.queue_position,
      caseId,
    });
  } catch (err) {
    console.error("[notify] email send error:", err);
    return jsonError("Failed to send email", 502);
  }

  return jsonOk({ sent: true });
}
