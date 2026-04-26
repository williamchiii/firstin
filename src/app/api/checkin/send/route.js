// POST /api/checkin/send
//
// Finds every discharged patient who hasn't received a check-in SMS yet and
// whose discharged_at is >= 3 minutes ago (shortened from 7 days for demo),
// sends them a localised follow-up SMS via Twilio, then stamps checkin_sms_sent_at.
//
// Returns: { ok, total, sent, failures: [{ id, phone_number, error }] }

import twilio from "twilio";
import { supabase } from "@/lib/supabase.js";
import { jsonError, jsonOk, methodNotAllowed } from "@/lib/http.js";

// --- SMS templates -----------------------------------------------------------
// Keyed by the `language` column value stored in the patients table.
// [name] is a literal placeholder replaced at send time.
const SMS_TEMPLATES = {
  english:
    "Hi [name], this is FirstIn checking in. How are you feeling since your ER visit? Reply to let us know.",
  spanish:
    "Hola [name], te contactamos desde FirstIn. ¿Cómo te has sentido desde tu visita a urgencias? Responde para contarnos.",
  portuguese:
    "Olá [name], aqui é o FirstIn. Como você está se sentindo desde sua visita à emergência? Responda para nos contar.",
  vietnamese:
    "Xin chào [name], đây là FirstIn. Bạn cảm thấy thế nào kể từ lần khám cấp cứu? Hãy trả lời để cho chúng tôi biết.",
  haitian_creole:
    "Bonjou [name], se FirstIn k ap rele ou. Kijan ou santi ou depi vizit ou nan ijans lan? Reponn pou fè nou konnen.",
};

// Fall back to English if the language stored isn't in our map.
const DEFAULT_LANGUAGE = "english";

/**
 * Build the SMS body for a patient, substituting their first name.
 * @param {string} name - Patient's full name from the DB.
 * @param {string} language - Language key from the patients table.
 * @returns {string} Localised message with [name] replaced.
 */
function buildMessage(name, language) {
  const template = SMS_TEMPLATES[language] ?? SMS_TEMPLATES[DEFAULT_LANGUAGE];
  // Use first name only to keep the message short and personal.
  const firstName = name?.split(" ")[0] ?? name ?? "there";
  return template.replace("[name]", firstName);
}

// --- POST /api/checkin/send --------------------------------------------------
export async function POST() {
  // --- Config validation ------------------------------------------------------
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    USE_MOCK_TWILIO,
  } = process.env;

  const isMock = USE_MOCK_TWILIO === "true";

  if (!isMock) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return jsonError(
        "Missing one or more Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)",
        500,
      );
    }
  }

  // --- Query: discharged patients without a check-in SMS ----------------------
  // cutoffTime = now - 3 minutes (demo shortcut; change to 7 days in production)
  const DEMO_DELAY_MINUTES = 3;
  const cutoffTime = new Date(Date.now() - DEMO_DELAY_MINUTES * 60 * 1000).toISOString();

  let patients;
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, language, phone_number, discharged_at")
      .eq("status", "discharged")
      .is("checkin_sms_sent_at", null)
      .lt("discharged_at", cutoffTime); // discharged_at is older than the cutoff

    if (error) throw error;
    patients = data ?? [];
  } catch (err) {
    console.error("[checkin/send] Supabase query failed:", err?.message ?? err);
    return jsonError("Failed to query patients from Supabase", 500);
  }

  console.log(`[checkin/send] Found ${patients.length} patient(s) to check in.`);

  if (patients.length === 0) {
    return jsonOk({ total: 0, sent: 0, failures: [] });
  }

  // --- Initialise Twilio client (skipped in mock mode) ------------------------
  let twilioClient = null;
  if (!isMock) {
    try {
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    } catch (err) {
      console.error("[checkin/send] Failed to init Twilio client:", err?.message ?? err);
      return jsonError("Failed to initialise Twilio client", 500);
    }
  }

  // --- Send messages and stamp each patient -----------------------------------
  let sent = 0;
  const failures = [];

  for (const patient of patients) {
    const { id, name, language, phone_number, discharged_at } = patient;

    // Guard: skip patients with no phone number rather than hard-failing the run.
    if (!phone_number) {
      console.warn(`[checkin/send] Patient ${id} has no phone number — skipping.`);
      failures.push({ id, phone_number: null, error: "no phone number on record" });
      continue;
    }

    const message = buildMessage(name, language ?? DEFAULT_LANGUAGE);

    // --- Send (or mock) the SMS ----------------------------------------------
    try {
      if (isMock) {
        // Demo / local dev — print instead of hitting Twilio.
        console.log(
          `[checkin/send] MOCK SMS → ${phone_number}\n` +
          `  Patient: ${name} (${id})\n` +
          `  Discharged at: ${discharged_at}\n` +
          `  Language: ${language}\n` +
          `  Message: ${message}`,
        );
      } else {
        await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: phone_number,
        });
        console.log(`[checkin/send] SMS sent to ${phone_number} (patient ${id})`);
      }

      // --- Stamp checkin_sms_sent_at so we never double-send ---------------
      const { error: updateError } = await supabase
        .from("patients")
        .update({ checkin_sms_sent_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) {
        // SMS was sent but stamp failed — log loudly so ops can reconcile.
        console.error(
          `[checkin/send] SMS sent but DB stamp failed for patient ${id}:`,
          updateError.message,
        );
        failures.push({ id, phone_number, error: `DB stamp failed: ${updateError.message}` });
        continue;
      }

      sent++;
    } catch (err) {
      const errMsg = err?.message ?? String(err);
      console.error(`[checkin/send] Failed to send SMS to patient ${id}:`, errMsg);
      failures.push({ id, phone_number, error: errMsg });
    }
  }

  // --- Summary response -------------------------------------------------------
  console.log(`[checkin/send] Done. Sent: ${sent}/${patients.length}. Failures: ${failures.length}.`);

  return jsonOk({
    total: patients.length,
    sent,
    failures,
  });
}

export function GET() {
  return methodNotAllowed(["POST"]);
}
