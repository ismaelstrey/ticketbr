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

function findStringValue(obj: unknown, predicate: (value: string) => boolean): string | null {
  if (!obj) return null;

  if (typeof obj === "string") {
    return predicate(obj) ? obj : null;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findStringValue(item, predicate);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const found = findStringValue(value, predicate);
      if (found) return found;
    }
  }

  return null;
}

function normalizeQrCode(raw: string | null) {
  if (!raw) return null;
  if (raw.startsWith("data:image")) return raw;
  return `data:image/png;base64,${raw}`;
}

export async function getEvolutionConnectionState() {
  try {
    return await evolutionRequest(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
  } catch {
    return null;
  }
}

export async function getEvolutionQrCode() {
  const attempts: Array<{ path: string; init?: RequestInit }> = [
    { path: `/instance/connect/${EVOLUTION_INSTANCE}`, init: { method: "GET" } },
    { path: `/instance/connect/${EVOLUTION_INSTANCE}`, init: { method: "POST" } },
    { path: `/instance/qrcode/${EVOLUTION_INSTANCE}`, init: { method: "GET" } }
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const payload = await evolutionRequest(attempt.path, attempt.init);
      const qrRaw = findStringValue(payload, (value) =>
        value.startsWith("data:image") || value.length > 100
      );
      const pairingCode = findStringValue(payload, (value) => /[A-Z0-9]{4}-?[A-Z0-9]{4}/i.test(value));

      return {
        qrCode: normalizeQrCode(qrRaw),
        pairingCode,
        raw: payload
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Não foi possível obter QR Code da Evolution API.");
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
