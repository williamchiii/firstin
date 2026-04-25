// POST /api/report
// owner: AI team (Gemini)
//
// REQUEST SHAPE
//   { patient: <processed patient from /api/intake response> }
//   or
//   { patient_id: "<uuid>" }   // look up the row from Supabase
//
// RESPONSE SHAPE (success)
//   200 { ok: true, report: { subjective, objective, assessment, plan } }
//
// RESPONSE SHAPE (error)
//   400 { ok: false, errors: ["..."] }   // bad input
//   404 { ok: false, errors: ["patient not found"] }
//   502 { ok: false, errors: ["upstream AI error"] }   // Gemini failure
//
// NOTES
//   - keep API key server-side only (process.env.GEMINI_API_KEY)
//   - on Gemini failure, return 502 — frontend should show a fallback
//   - SOAP fields should be plain strings (no markdown), one paragraph each
//   - never expose patient PII in error messages

import { jsonError, methodNotAllowed } from "@/lib/http.js";

export async function POST() {
  // TODO(ai-team): implement Gemini-backed SOAP report
  return jsonError("not implemented", 501);
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
