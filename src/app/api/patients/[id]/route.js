// PATCH /api/patients/[id]
// nurse updates a patient's status; "completed" effectively removes them from /api/queue
//
// REQUEST  { status: "waiting" | "in_progress" | "completed" }
// RESPONSE 200 { ok: true, patient: {...} }
//          400 invalid id or status
//          404 patient not found
//          500 db error

import { jsonError, jsonOk, methodNotAllowed, readJsonBody } from "@/lib/http.js";
import { supabase } from "@/lib/supabase.js";

const ALLOWED_STATUSES = ["waiting", "in_progress", "completed"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return jsonError("invalid patient id", 400);
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const status = parsed.body?.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    return jsonError(
      `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      400,
    );
  }

  const { data, error } = await supabase
    .from("patients")
    .update({ status })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("supabase patient update error:", error);
    return jsonError(error.message, 500);
  }
  if (!data) return jsonError("patient not found", 404);

  return jsonOk({ patient: data });
}

export async function GET() {
  return methodNotAllowed(["PATCH"]);
}
