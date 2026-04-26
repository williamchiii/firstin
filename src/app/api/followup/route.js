// POST /api/followup
// owner: AI team (Gemini)
//
// REQUEST SHAPE
//   { chief_complaint: string, language?: "en" | "es" | "ht" | "pt" | "vi" }
//   (also accepts chiefComplaint for backwards-compat with existing frontend)
//
// RESPONSE SHAPE (success)
//   200 { ok: true, questions: [{ id, type, label, options? }] }
//
// RESPONSE SHAPE (validation error)
//   400 { ok: false, errors: ["chief_complaint is required"] }
//
// NOTES
//   - Gemini failures return 200 with fallback questions, never a 5xx to the kiosk
//   - ESI score / clinical data: NOT handled here — this route is stateless
//   - Use gemini-1.5-flash (not pro): speed matters more than depth for UX

import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonError, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http.js";

// ── FALLBACK QUESTIONS ────────────────────────────────────────────────────────
// Returned as-is when Gemini is unavailable or returns unparseable output.
// Chosen to be clinically useful regardless of the chief complaint.
const FALLBACK_QUESTIONS = [
  {
    id: "onset_time",
    type: "choice",
    label: "How long ago did your symptoms start?",
    options: ["Less than 1 hour", "1 to 6 hours", "6 to 24 hours", "More than a day"],
  },
  {
    id: "severity_change",
    type: "choice",
    label: "Are your symptoms getting better, worse, or staying the same?",
    options: ["Getting worse", "Staying the same", "Getting better"],
  },
  {
    id: "movement_effect",
    type: "boolean",
    label: "Does moving around make your symptoms worse?",
  },
  {
    id: "additional_symptoms",
    type: "text",
    label: "Is there anything else about your symptoms you want us to know?",
  },
];

// ── MOCK RESPONSE ─────────────────────────────────────────────────────────────
// Returned when USE_MOCK_GEMINI=true — chest pain patient for demo queue reorder.
const MOCK_QUESTIONS = [
  {
    id: "pain_radiation",
    type: "choice",
    label: "Does the pain spread anywhere else?",
    options: ["Yes, to my jaw", "Yes, to my left arm", "Yes, to my back", "No, just my chest"],
  },
  {
    id: "onset_timing",
    type: "choice",
    label: "When did the chest tightness start?",
    options: ["Less than 30 minutes ago", "30 minutes to 2 hours ago", "More than 2 hours ago"],
  },
  {
    id: "sweating",
    type: "boolean",
    label: "Are you sweating or feeling nauseous right now?",
  },
  {
    id: "breathing_effect",
    type: "boolean",
    label: "Does the pain get worse when you take a deep breath?",
  },
];

// ── PROMPT ────────────────────────────────────────────────────────────────────
// System prompt is engineered to:
//   - prevent generic "tell me more about your symptoms" questions (useless for triage)
//   - focus Gemini on the clinical dimensions that determine ESI: radiation, onset,
//     associated symptoms, aggravating factors, loss of function
//   - ban medication/history questions (collected in the next step)
//   - enforce structured JSON output so we can validate the shape without regex
const SYSTEM_PROMPT = `You are a clinical triage assistant helping gather information from a patient in an emergency room. Based on the patient's chief complaint, generate exactly 3 to 4 targeted follow-up questions that a triage nurse would ask to assess urgency.

Rules:
- Questions must be clinically relevant to the specific complaint — never generic
- Each question must help determine severity, not just gather information
- Prioritize questions about: radiation of pain, onset timing, associated symptoms, aggravating factors, and loss of function
- Use plain simple language the patient can understand — no medical jargon
- Return questions in the patient's language based on the locale provided
- Never ask about medications or medical history — that is collected separately
- Never ask about pain on a scale of 1-10 — that is already collected in the main form
- Return ONLY valid JSON, no commentary, no markdown fences

Return this exact shape:
{
  "questions": [
    {
      "id": "snake_case_id",
      "type": "choice | scale | boolean | text",
      "label": "question text in patient language",
      "options": ["option1", "option2"]
    }
  ]
}

Question types:
- choice: patient picks one option from the provided list
- scale: patient picks a number 1-10 (omit options field)
- boolean: yes or no question (omit options field)
- text: short free-text answer (omit options field)

Examples of GOOD questions for "chest pain":
- Does the pain spread to your jaw, arm, or back? (choice: yes jaw, yes arm, yes back, no)
- How long ago did the pain start? (choice: less than 30 min, 30 min to 2 hours, more than 2 hours)
- Does the pain get worse when you breathe in? (boolean)
- Are you sweating or feeling nauseous? (boolean)

Examples of BAD questions — never generate these:
- Can you describe your symptoms further? (too vague)
- Do you have any medical conditions? (collected separately)
- What medications are you taking? (collected separately)
- On a scale of 1-10 how bad is it? (already collected in the main form)`;

// Validated question types the frontend knows how to render
const VALID_TYPES = new Set(["choice", "scale", "boolean", "text"]);

// Light validation so a malformed Gemini response doesn't reach the client.
// Falls back to FALLBACK_QUESTIONS rather than throwing.
function parseAndValidateQuestions(raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }

  const questions = parsed?.questions;
  if (!Array.isArray(questions) || questions.length < 2 || questions.length > 5) {
    return null;
  }

  const validated = [];
  for (const q of questions) {
    if (typeof q.id !== "string" || !q.id.trim()) return null;
    if (!VALID_TYPES.has(q.type)) return null;
    if (typeof q.label !== "string" || !q.label.trim()) return null;

    // choice questions must have at least 2 options
    if (q.type === "choice") {
      if (!Array.isArray(q.options) || q.options.length < 2) return null;
      validated.push({ id: q.id.trim(), type: q.type, label: q.label.trim(), options: q.options });
    } else {
      // scale / boolean / text — strip options if accidentally included
      validated.push({ id: q.id.trim(), type: q.type, label: q.label.trim() });
    }
  }

  return validated;
}

// ── POST /api/followup ────────────────────────────────────────────────────────
export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const body = parsed.body;

  // Accept both snake_case (spec) and camelCase (existing frontend)
  const chief_complaint = (body.chief_complaint ?? body.chiefComplaint ?? "").trim();
  const language = (body.language ?? "en").trim();

  if (!chief_complaint) {
    return jsonError("chief_complaint is required", 400);
  }

  // ── Mock mode ─────────────────────────────────────────────────────────────
  if (process.env.USE_MOCK_GEMINI === "true") {
    return jsonOk({ questions: MOCK_QUESTIONS });
  }

  // ── Gemini call ───────────────────────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // gemini-1.5-flash: optimised for latency — target <2s for kiosk UX
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        // Structured JSON output — no markdown fences, no prose wrapping
        responseMimeType: "application/json",
        temperature: 0.3,      // some variation so questions don't feel templated
        maxOutputTokens: 1024,
      },
    });

    // Note for non-English: instruct Gemini to write labels/options in target language.
    // The system prompt already mentions locale; this reinforces it in the user turn.
    const languageNote =
      language !== "en"
        ? `\nIMPORTANT: All question labels and option text must be written in the language with locale code "${language}".`
        : "";

    const userMessage =
      `Chief complaint: ${chief_complaint}\n` +
      `Patient language: ${language}${languageNote}\n` +
      `Generate 3-4 targeted clinical follow-up questions.`;

    const result = await model.generateContent(userMessage);
    const responseText = result.response.text();

    const questions = parseAndValidateQuestions(responseText);

    if (!questions) {
      // Gemini returned something we can't use — fall back silently
      console.warn("[followup] Gemini response failed validation, using fallback");
      return jsonOk({ questions: FALLBACK_QUESTIONS });
    }

    return jsonOk({ questions });
  } catch (err) {
    // Network error, API key issue, timeout, etc. — never surface a 5xx to the kiosk
    console.error("[followup] Gemini call failed:", err?.message ?? err);
    return jsonOk({ questions: FALLBACK_QUESTIONS });
  }
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
