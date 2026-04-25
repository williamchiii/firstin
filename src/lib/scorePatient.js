// AI-backed triage scoring (Gemini)
// owner: AI team
//
// Contract:
//   input:  normalized patient (output of validateIntake)
//   output: { esi_score, wait_category, red_flags, clinical_rationale }
//   - shape MUST match what triage() returns so it's a drop-in replacement
//   - throw on any failure (timeout, bad response, key missing); the route
//     will catch and fall back to rule-based triage()

export async function scorePatient(_normalizedPatient) {
  // TODO(ai-team): call Gemini here, validate the response, and return the
  // same shape as src/lib/triage.js -> triage(). Throw on any failure.
  throw new Error("scorePatient not implemented");
}
