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
