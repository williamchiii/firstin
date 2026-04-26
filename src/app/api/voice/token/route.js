import { jsonError, jsonOk } from "@/lib/http.js";
import { getConversationToken } from "@/lib/elevenlabs.js";

export async function GET() {
  try {
    const conversationToken = await getConversationToken();
    return jsonOk({ conversationToken });
  } catch (err) {
    console.error("[voice/token] error:", err instanceof Error ? err.message : String(err));
    return jsonError(err instanceof Error ? err.message : "Failed to get conversation token", 500);
  }
}
