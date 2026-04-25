// AI-backed triage scoring (Gemini)
// owner: AI team
//
// Contract:
//   input:  normalized patient (output of validateIntake)
//   output: { esi_score, wait_category, red_flags, clinical_rationale }
//   - shape MUST match what triage() returns so it's a drop-in replacement
//   - throw on any failure (timeout, bad response, key missing); the route
//     will catch and fall back to rule-based triage()

import { ESI_TO_WAIT_CATEGORY } from "./constants.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 5000;

// wait_category is derived from esi_score server-side; don't ask Gemini for it
const responseSchema = {
  type: "object",
  properties: {
    esi_score: { type: "integer", minimum: 1, maximum: 5 },
    red_flags: { type: "string" },
    clinical_rationale: { type: "string" },
  },
  required: ["esi_score", "red_flags", "clinical_rationale"],
};

function validateScoring(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gemini returned a non-object scoring payload");
  }

  const esiScore = value.esi_score;
  if (!Number.isInteger(esiScore) || esiScore < 1 || esiScore > 5) {
    throw new Error("Gemini returned an invalid esi_score");
  }

  if (typeof value.red_flags !== "string") {
    throw new Error("Gemini returned invalid red_flags");
  }

  if (typeof value.clinical_rationale !== "string" || value.clinical_rationale.trim() === "") {
    throw new Error("Gemini returned invalid clinical_rationale");
  }

  return {
    esi_score: esiScore,
    wait_category: ESI_TO_WAIT_CATEGORY[esiScore],
    red_flags: value.red_flags.trim(),
    clinical_rationale: value.clinical_rationale.trim(),
  };
}

function extractResponseText(payload) {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text)
    .filter(Boolean)
    .join("");

  if (!text) {
    const finishReason = payload?.candidates?.[0]?.finishReason;
    console.error("[scorePatient] empty response. finishReason:", finishReason);
    throw new Error(`Gemini returned no response text (finishReason: ${finishReason})`);
  }
  return text;
}

export async function scorePatient(normalizedPatient) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Score this normalized emergency department intake using Emergency Severity Index levels 1-5.
Return only JSON matching the schema. Lower numbers are higher acuity.
Patient: ${JSON.stringify(normalizedPatient)}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseJsonSchema: responseSchema,
            // gemini-2.5 thinks before answering and burns the token budget on
            // hidden reasoning. disable for deterministic structured output.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini request failed with ${res.status}`);
    }

    return validateScoring(JSON.parse(extractResponseText(await res.json())));
  } finally {
    clearTimeout(timeout);
  }
}
