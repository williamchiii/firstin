// Server-side ElevenLabs helper — never import from client components.
// Uses raw fetch (not the elevenlabs-js SDK) to avoid CJS/ESM interop issues.

// ─── Conversational AI (voice intake) ────────────────────────────────────────

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

// ─── Text-to-speech (staff confirmation / discharge playback) ─────────────────

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export const VOICE_MAP = {
  english: "EXAVITQu4vr4xnSDxMaL",
  spanish: "EXAVITQu4vr4xnSDxMaL",
  portuguese: "EXAVITQu4vr4xnSDxMaL",
  vietnamese: "EXAVITQu4vr4xnSDxMaL",
  haitian_creole: "EXAVITQu4vr4xnSDxMaL",
};

const CONFIRMATION_TEMPLATES = {
  english: (waitCategory, chiefComplaint) =>
    `You have been checked in successfully. Your symptoms were recorded as ${chiefComplaint}. Your estimated wait category is ${waitCategory}. Please remain in the waiting area. Staff will call you shortly.`,
  spanish: (waitCategory, chiefComplaint) =>
    `Ha sido registrado exitosamente. Sus síntomas fueron registrados como ${chiefComplaint}. Su categoría de espera estimada es ${waitCategory}. Por favor permanezca en la sala de espera. El personal lo llamará en breve.`,
  portuguese: (waitCategory, chiefComplaint) =>
    `Você foi registrado com sucesso. Seus sintomas foram registrados como ${chiefComplaint}. Sua categoria de espera estimada é ${waitCategory}. Por favor, permaneça na sala de espera. A equipe irá chamá-lo em breve.`,
  vietnamese: (waitCategory, chiefComplaint) =>
    `Bạn đã được đăng ký thành công. Các triệu chứng của bạn đã được ghi nhận là ${chiefComplaint}. Mức độ ưu tiên chờ đợi ước tính của bạn là ${waitCategory}. Vui lòng ở lại phòng chờ. Nhân viên sẽ gọi bạn trong thời gian ngắn.`,
  haitian_creole: (waitCategory, chiefComplaint) =>
    `Ou te anrejistre avèk siksè. Sentòm ou yo te anrejistre kòm ${chiefComplaint}. Kategori datant estimé ou se ${waitCategory}. Tanpri rete nan sal datant lan. Pèsonèl la ap rele ou byento.`,
};

const DISCHARGE_TEMPLATES = {
  english: (instructions) =>
    `Your discharge instructions are ready. Please carefully follow these recovery steps: ${instructions}. If your symptoms worsen, return to the emergency room immediately.`,
  spanish: (instructions) =>
    `Sus instrucciones de alta están listas. Por favor siga cuidadosamente estos pasos de recuperación: ${instructions}. Si sus síntomas empeoran, regrese a la sala de emergencias de inmediato.`,
  portuguese: (instructions) =>
    `Suas instruções de alta estão prontas. Por favor, siga cuidadosamente estas etapas de recuperação: ${instructions}. Se seus sintomas piorarem, retorne imediatamente à sala de emergência.`,
  vietnamese: (instructions) =>
    `Hướng dẫn xuất viện của bạn đã sẵn sàng. Vui lòng làm theo cẩn thận các bước hồi phục sau: ${instructions}. Nếu các triệu chứng của bạn trở nên tệ hơn, hãy quay lại phòng cấp cứu ngay lập tức.`,
  haitian_creole: (instructions) =>
    `Enstriksyon sòti ou yo pare. Tanpri swiv pwen rekiperasyon sa yo avèk anpil swen: ${instructions}. Si sentòm ou yo vin pi mal, retounen nan sal ijans lan imedyatman.`,
};

/**
 * Generates audio from text using the ElevenLabs TTS API.
 * Supports mock mode via ELEVENLABS_MOCK_MODE=true for demo resilience.
 * @returns {Promise<{ok: true, audioBuffer: Buffer, mimeType: string, mock?: true} | {ok: false, error: string}>}
 */
export async function generateAudio(text, language) {
  try {
    if (process.env.ELEVENLABS_MOCK_MODE === "true") {
      return { ok: true, mock: true, audioBuffer: Buffer.from("mock-audio"), mimeType: "audio/mpeg" };
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { ok: false, error: "ELEVENLABS_API_KEY is not set" };

    const voiceId = VOICE_MAP[language];
    if (!voiceId) return { ok: false, error: `Unsupported language: ${language}` };

    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { ok: false, error: `ElevenLabs API error ${response.status}: ${errorText}` };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("Content-Type") || "audio/mpeg";
    return { ok: true, audioBuffer, mimeType };
  } catch (err) {
    return { ok: false, error: err?.message ?? "Unknown error in generateAudio" };
  }
}

/**
 * Builds a patient-friendly post-intake confirmation message in the given language.
 * @returns {{ok: true, text: string} | {ok: false, error: string}}
 */
export function buildConfirmationText(waitCategory, chiefComplaint, language) {
  try {
    const template = CONFIRMATION_TEMPLATES[language];
    if (!template) return { ok: false, error: `Unsupported language: ${language}` };
    return { ok: true, text: template(waitCategory, chiefComplaint) };
  } catch (err) {
    return { ok: false, error: err?.message ?? "Unknown error in buildConfirmationText" };
  }
}

/**
 * Wraps discharge instructions in a spoken-friendly message for kiosk playback.
 * @returns {{ok: true, text: string} | {ok: false, error: string}}
 */
export function buildDischargeText(recoveryInstructions, language) {
  try {
    const template = DISCHARGE_TEMPLATES[language];
    if (!template) return { ok: false, error: `Unsupported language: ${language}` };
    return { ok: true, text: template(recoveryInstructions) };
  } catch (err) {
    return { ok: false, error: err?.message ?? "Unknown error in buildDischargeText" };
  }
}
