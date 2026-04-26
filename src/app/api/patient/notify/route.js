import { jsonError, jsonOk, readJsonBody } from "@/lib/http.js";
import { sendTriageConfirmation } from "@/lib/email.js";
import { ESI_TO_WAIT_CATEGORY } from "@/lib/constants.js";
import { supabase } from "@/lib/supabase.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { patientId, email } = parsed.body;

  if (!patientId || !email) {
    return jsonError("patientId and email are required", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Invalid email address", 400);
  }

  // Fetch patient for ESI score — patients table is the source of truth
  const { data: patient, error: fetchError } = await supabase
    .from("patients")
    .select("esi_score")
    .eq("id", patientId)
    .single();

  if (fetchError || !patient) {
    console.error("[notify] patient fetch error:", fetchError);
    return jsonError("Patient not found", 404);
  }

  // Persist email on patient row (non-fatal)
  const { error: updateError } = await supabase
    .from("patients")
    .update({ email })
    .eq("id", patientId);

  if (updateError) {
    console.error("[notify] patient email update error (non-fatal):", updateError);
  }

  // Get live queue position — same logic as /api/queue so numbers always match
  const { data: queueRows } = await supabase
    .from("patients")
    .select("id")
    .in("status", ["waiting", "in_progress"])
    .order("esi_score", { ascending: true })
    .order("arrival_time", { ascending: true });

  const queuePosition = Math.max(1, (queueRows ?? []).findIndex((r) => r.id === patientId) + 1);

  try {
    await sendTriageConfirmation({
      to: email,
      esi: patient.esi_score,
      waitCategory: ESI_TO_WAIT_CATEGORY[patient.esi_score],
      queuePosition,
      patientId,
    });
  } catch (err) {
    console.error("[notify] email send error:", err.message);
    return jsonError(`Failed to send email: ${err.message}`, 502);
  }

  return jsonOk({ sent: true });
}
