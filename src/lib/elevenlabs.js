// Server-side ElevenLabs helper — never import from client components.
// Uses raw fetch (not the elevenlabs-js SDK) to avoid CJS/ESM interop issues.

/**
 * Returns a short-lived WebRTC conversation token for the conversational agent.
 * @returns {Promise<string>} WebRTC conversation token.
 */
export async function getConversationToken() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set in .env.local");
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID is not set in .env.local");

  const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = body?.detail;
    const msg = typeof detail === "string"
      ? detail
      : detail?.message ?? body?.message ?? JSON.stringify(body);
    throw new Error(`ElevenLabs API error ${res.status}: ${msg}`);
  }

  const token = body.token ?? body.conversation_token;
  if (!token) throw new Error(`No token in ElevenLabs response: ${JSON.stringify(body)}`);

  return token;
}
