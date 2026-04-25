// POST /api/followup
// owner: AI team (Gemini)
//
// REQUEST SHAPE
//   { chiefComplaint: string, language?: "en" | "es" | ... }
//
// RESPONSE SHAPE (success)
//   200 { ok: true, questions: ["...", "...", "...", "..."] }   // 2-4 items
//
// RESPONSE SHAPE (error)
//   400 { ok: false, errors: ["chiefComplaint is required"] }
//   502 { ok: false, errors: ["upstream AI error"] }
//
// NOTES
//   - keep API key server-side only (process.env.GEMINI_API_KEY)
//   - questions should be short, plain text, no numbering / markdown
//   - if Gemini fails, return 502 — frontend can fall back to a generic set
//   - return 2-4 questions max; the frontend renders them as-is

import { jsonError, methodNotAllowed } from "@/lib/http.js";

export async function POST() {
  // TODO(ai-team): implement Gemini-backed follow-up question generator
  return jsonError("not implemented", 501);
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
