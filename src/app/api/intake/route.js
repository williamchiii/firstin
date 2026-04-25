import { validateIntake } from "@/lib/validate.js";
import { triage } from "@/lib/triage.js";
import { jsonError, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http.js";

export async function POST(req) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { ok, errors, normalized } = validateIntake(parsed.body);
  if (!ok) return jsonError(errors, 400);

  const triageResult = triage(normalized);

  // shape that matches the `patients` Supabase table
  const patient = {
    name: normalized.name,
    language: normalized.language,
    chief_complaint: normalized.chief_complaint,
    symptoms: normalized.symptoms,
    pain_level: normalized.pain_level,
    esi_score: triageResult.esi_score,
    red_flags: triageResult.red_flags,
    clinical_rationale: triageResult.clinical_rationale,
    status: "waiting",
    // id, arrival_time, queue_position will be set on insert
  };

  // TODO(db-team): insert `patient` into the `patients` table.
  //   - let Postgres set id / arrival_time via column defaults
  //   - compute queue_position (e.g. count of waiting rows with esi_score <= patient.esi_score)
  //   - .select().single() the inserted row and replace `patient` below with it
  //   - on insert error, return jsonError(error.message, 500)

  return jsonOk(
    { patient, wait_category: triageResult.wait_category },
    201,
  );
}

export async function GET() {
  return methodNotAllowed(["POST"]);
}
