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

const TRANSCRIPT_SCHEMA = {
  type: "object",
  properties: {
    chiefComplaint: { type: "string" },
    symptoms: { type: "array", items: { type: "string" } },
    painLevel: { type: "number", nullable: true },
    duration: { type: "string", nullable: true },
    redFlags: { type: "array", items: { type: "string" } },
    demographics: {
      type: "object",
      nullable: true,
      properties: {
        age: { type: "number" },
        dob: { type: "string" },
        name: { type: "string" },
      },
    },
    emailMentioned: { type: "string", nullable: true },
  },
  required: ["chiefComplaint", "symptoms", "redFlags"],
};

/**
 * Parses a voice conversation transcript into structured triage data.
 * @param {string} transcript - Full conversation transcript.
 * @returns {Promise<{ chiefComplaint: string, symptoms: string[], painLevel: number|null, duration: string|null, redFlags: string[], demographics: object|null, emailMentioned: string|null }>}
 */
export async function parseVoiceTranscript(transcript) {
  const prompt = `You are a clinical triage assistant. Extract structured patient information from this emergency department intake conversation transcript.

Transcript:
${transcript}

Extract all medical information mentioned. For chiefComplaint, use the patient's own words summarized clinically. For symptoms, list each distinct symptom. For painLevel, use the 0-10 scale if mentioned. For redFlags, include any life-threatening indicators (chest pain, difficulty breathing, altered consciousness, severe bleeding, etc.). For demographics, extract name, age, or date of birth if mentioned. For emailMentioned, capture any email address the patient provided.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPT_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Gemini returned empty response for transcript parsing");

  const parsed = JSON.parse(raw);
  return {
    chiefComplaint: parsed.chiefComplaint ?? "",
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    painLevel: parsed.painLevel ?? null,
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
