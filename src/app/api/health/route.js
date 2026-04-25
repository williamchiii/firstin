import { jsonOk } from "@/lib/http.js";

export async function GET() {
  return jsonOk({ status: "ok", service: "waitwise-api" });
}
