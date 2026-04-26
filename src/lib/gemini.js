import { GoogleGenAI } from "@google/genai";

// --- Client ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.0-flash";

// --- SOAP note generation ---

/**
 * Generates a clinical SOAP note from structured patient data.
 * @param {Object} patientData - Patient info (symptoms, vitals, history, etc.)
 * @returns {Promise<string>} The generated SOAP note as plain text.
 */
export async function generateSOAPNote(patientData) {
  const prompt = `You are a clinical documentation assistant. Generate a structured SOAP note based on the following patient data. Use standard medical SOAP format (Subjective, Objective, Assessment, Plan).

Patient Data:
${JSON.stringify(patientData, null, 2)}

Return only the SOAP note text, no additional commentary.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  return response.text;
}

// --- Voice transcript parsing ---

/**
 * Parses a voice conversation transcript into structured triage data.
 * @param {string} transcript - Full conversation transcript.
 * @returns {Promise<{ chiefComplaint: string, symptoms: string[], painLevel: number|null, duration: string|null, redFlags: string[], demographics: object|null, emailMentioned: string|null }>}
 */
export async function parseVoiceTranscript(transcript) {
  const prompt = `You are a clinical triage assistant. Extract structured patient information from this emergency department intake conversation transcript.

Transcript:
${transcript}

Rules:
- chiefComplaint: the patient's PRIMARY reason for visiting, summarized clinically (e.g. "high fever and body aches"). NEVER leave empty — if any symptom or reason was mentioned, fill it in.
- symptoms: array of each distinct symptom the patient mentions
- painLevel: numeric 0-10 if mentioned, otherwise null
- duration: how long symptoms have lasted, if mentioned, otherwise null
- redFlags: array of life-threatening indicators (chest pain, difficulty breathing, altered consciousness, severe bleeding, etc.). Empty array if none.
- demographics.name: the patient's name — extract even if only the agent says it (e.g. "Thank you, Mr. Smith" → "Mr. Smith")
- demographics.dob: date of birth if mentioned, return as-is (e.g. "February 25th, 1990")
- demographics.age: numeric age if mentioned
- emailMentioned: any email address the patient provides, otherwise null

Return ONLY a JSON object in this exact shape — no markdown, no explanation:
{
  "chiefComplaint": "string",
  "symptoms": ["string"],
  "painLevel": null,
  "duration": null,
  "redFlags": [],
  "demographics": { "name": "string", "dob": null, "age": null },
  "emailMentioned": null
}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const raw = response.text?.trim();
  if (!raw) throw new Error("Gemini returned empty response for transcript parsing");

  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  console.log("[gemini] parseVoiceTranscript raw response:", jsonStr.slice(0, 500));
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error("[gemini] JSON.parse failed:", parseErr.message, "\nRaw was:", jsonStr.slice(0, 300));
    throw parseErr;
  }
  return {
    chiefComplaint: parsed.chiefComplaint ?? "",
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    painLevel: typeof parsed.painLevel === "number" ? parsed.painLevel : null,
    duration: parsed.duration ?? null,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    demographics: parsed.demographics ?? null,
    emailMentioned: parsed.emailMentioned ?? null,
  };
}

// --- Wound photo analysis ---

/**
 * Analyzes a wound photo and returns a clinical description.
 * @param {string} base64Image - Base64-encoded image data (no data URI prefix).
 * @param {string} mimeType - MIME type of the image (e.g. "image/jpeg").
 * @returns {Promise<string>} Clinical description of the wound.
 */
export async function analyzeWoundPhoto(base64Image, mimeType) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        parts: [
          {
            text: "You are a clinical documentation assistant. Analyze this wound photo and provide a concise clinical description including: wound type, approximate size/depth if visible, tissue appearance, signs of infection or healing, and any immediate concerns. Be objective and clinical.",
          },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
  });

  return response.text;
}
