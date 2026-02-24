const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_API_INSTANCE;

function isConfigured() {
  return Boolean(EVOLUTION_BASE_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE);
}

async function evolutionRequest(path: string, init?: RequestInit) {
  if (!isConfigured()) {
    throw new Error("Evolution API não configurada. Defina EVOLUTION_API_BASE_URL, EVOLUTION_API_KEY e EVOLUTION_API_INSTANCE.");
  }

  const response = await fetch(`${EVOLUTION_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY as string,
      ...init?.headers
    }
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || json?.error || `Evolution API error (${response.status})`);
  }

  return json;
}

export async function sendTextToEvolution(number: string, text: string) {
  return evolutionRequest(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      text,
      delay: 0,
      presenceType: "composing"
    })
  });
}

export async function sendMediaToEvolution(input: {
  number: string;
  caption?: string;
  fileName: string;
  mimeType: string;
  media: string;
}) {
  return evolutionRequest(`/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    body: JSON.stringify({
      number: input.number,
      mediatype: "document",
      mimetype: input.mimeType,
      caption: input.caption ?? "",
      media: input.media,
      fileName: input.fileName,
      delay: 0
    })
  });
}

export async function fetchMessagesFromEvolution(number: string) {
  return evolutionRequest(`/chat/findMessages/${EVOLUTION_INSTANCE}/${encodeURIComponent(number)}`);
}

export function evolutionIsConfigured() {
  return isConfigured();
}
