// GET /api/queue
// returns staff-visible patients, sorted by acuity then arrival time
//
// RESPONSE
//   200 { ok: true, patients: [...] }
//   500 { ok: false, errors: ["..."] }

import { jsonError, jsonOk, methodNotAllowed } from "@/lib/http.js";
import { supabase } from "@/lib/supabase.js";

const QUEUE_STATUSES = ["waiting", "in_progress", "completed"];

export async function GET() {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .in("status", QUEUE_STATUSES)
    .order("esi_score", { ascending: true })
    .order("arrival_time", { ascending: true });

  if (error) {
    console.error("supabase queue read error:", error);
    return jsonError(error.message, 500);
  }

  // queue_position is derived at read time so it's always in sync with the
  // current set of active patients. ordering is already (esi_score, arrival_time).
  const patients = (data ?? []).map((p, i) => ({ ...p, queue_position: i + 1 }));

  return jsonOk({ patients });
}

export async function POST() {
  return methodNotAllowed(["GET"]);
}
