import { jsonOk, jsonError, methodNotAllowed, readJsonBody } from "@/lib/http.js";
import { supabase } from "@/lib/supabase.js";
import { generateAudio } from "@/lib/elevenlabs.js";
import { createPrescription } from "@/lib/prescriptions.js";

export async function POST(req) {
  try {
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const {
      patient_id,
      prescribed_by,
      medications,
      dosage_notes,
      recovery_steps,
      follow_up_date,
      notes,
    } = parsed.body;

    // --- validation ---
    if (!patient_id || !prescribed_by) {
      return jsonError("patient_id and prescribed_by are required", 400);
    }

    // --- fetch patient language ---
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("language")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      return jsonError("Patient not found", 404);
    }

    // --- build audio text ---
    const audioText =
      `Your prescription from your emergency room visit. ` +
      `Your medications are: ${medications}. ` +
      `${dosage_notes}. ` +
      `For your recovery: ${recovery_steps}. ` +
      `Please follow up with your doctor on ${follow_up_date}. ` +
      `${notes}`;

    // --- generate audio + upload to storage ---
    let audioUrl = null;
    let warning = null;

    const audioResult = await generateAudio(audioText, patient.language);

    if (audioResult.ok) {
      const storagePath = `${patient_id}/prescription.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("prescription-audio")
        .upload(storagePath, audioResult.audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("prescription-audio")
          .getPublicUrl(storagePath);
        audioUrl = urlData?.publicUrl ?? null;
      } else {
        console.error("[prescription] storage upload failed:", uploadError);
        warning = "Audio generation failed";
      }
    } else {
      console.error("[prescription] generateAudio failed:", audioResult.error);
      warning = "Audio generation failed";
    }

    // --- insert prescription ---
    const prescResult = await createPrescription(supabase, {
      patient_id,
      prescribed_by,
      medications,
      dosage_notes,
      recovery_steps,
      follow_up_date,
      notes,
      audio_url: audioUrl,
    });

    if (!prescResult.ok) {
      return jsonError(prescResult.error, 500);
    }

    const responseData = {
      prescription_id: prescResult.data.id,
      audio_url: audioUrl,
    };
    if (warning) responseData.warning = warning;

    return jsonOk(responseData, 201);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
