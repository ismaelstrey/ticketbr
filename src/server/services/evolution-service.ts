const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_API_INSTANCE;

export interface EvolutionConversation {
  id: string;
  number: string;
  name: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface EvolutionMappedMessage {
  id: string;
  number: string;
  direction: "in" | "out";
  text?: string;
  createdAt: string;
}

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

function onlyDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value === "number") {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return undefined;
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

function findArrays(obj: unknown): unknown[][] {
  if (!obj) return [];
  if (Array.isArray(obj)) {
    const nested = obj.flatMap(findArrays);
    return [obj, ...nested];
  }
  if (typeof obj === "object") {
    return Object.values(obj as Record<string, unknown>).flatMap(findArrays);
  }
  return [];
}

function extractTextFromMessage(message: Record<string, unknown>) {
  const conversation = message.conversation;
  if (typeof conversation === "string" && conversation.trim()) return conversation;
  const ext = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext && typeof ext.text === "string") return ext.text;
  const image = message.imageMessage as Record<string, unknown> | undefined;
  if (image && typeof image.caption === "string") return image.caption;
  return undefined;
}

function mapRawConversation(item: unknown): EvolutionConversation | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const remoteJid =
    (typeof record.remoteJid === "string" && record.remoteJid) ||
    (typeof record.id === "string" && record.id.includes("@") ? record.id : "") ||
    (typeof record.jid === "string" ? record.jid : "");

  const number = onlyDigits(remoteJid || String(record.number ?? ""));
  if (!number) return null;

  const name =
    String(record.name ?? record.pushName ?? record.notify ?? record.subject ?? number).trim() || number;

  const lastMessage =
    String(record.lastMessage ?? record.lastTextMessage ?? record.lastmessage ?? "").trim() || undefined;

  const lastMessageAt =
    toIsoDate(record.lastMessageTimestamp) ||
    toIsoDate(record.updatedAt) ||
    toIsoDate(record.conversationTimestamp) ||
    toIsoDate(record.timestamp);

  return {
    id: remoteJid || `${number}@s.whatsapp.net`,
    number,
    name,
    lastMessage,
    lastMessageAt
  };
}

function mapRawMessage(item: unknown, fallbackNumber: string): EvolutionMappedMessage | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const key = (record.key ?? {}) as Record<string, unknown>;
  const message = (record.message ?? {}) as Record<string, unknown>;

  const remoteJid =
    (typeof key.remoteJid === "string" && key.remoteJid) ||
    (typeof record.remoteJid === "string" ? record.remoteJid : "");
  const number = onlyDigits(remoteJid || fallbackNumber);
  if (!number) return null;

  const text =
    extractTextFromMessage(message) ||
    (typeof record.body === "string" ? record.body : undefined) ||
    (typeof record.text === "string" ? record.text : undefined);

  const fromMe = Boolean(key.fromMe ?? record.fromMe);
  const id =
    String(key.id ?? record.id ?? `${number}-${record.messageTimestamp ?? record.timestamp ?? Date.now()}`);

  const createdAt =
    toIsoDate(record.messageTimestamp) ||
    toIsoDate(record.timestamp) ||
    toIsoDate(record.createdAt) ||
    new Date().toISOString();

  return {
    id,
    number,
    direction: fromMe ? "out" : "in",
    text,
    createdAt
  };
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
      const qrRaw = findStringValue(payload, (value) => value.startsWith("data:image") || value.length > 100);
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

export async function fetchConversationsFromEvolution() {
  if (!isConfigured()) return [];

  const attempts = [
    `/chat/findChats/${EVOLUTION_INSTANCE}`,
    `/chat/findChats/${EVOLUTION_INSTANCE}?page=1&limit=300`,
    `/chat/all/${EVOLUTION_INSTANCE}`
  ];

  let lastError: unknown = null;

  for (const path of attempts) {
    try {
      const payload = await evolutionRequest(path, { method: "GET" });
      const arrays = findArrays(payload);
      const mapped = arrays.flatMap((arr) => arr.map(mapRawConversation).filter(Boolean) as EvolutionConversation[]);

      if (mapped.length) {
        const unique = new Map<string, EvolutionConversation>();
        mapped.forEach((item) => unique.set(item.number, item));
        return Array.from(unique.values()).sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("Could not load conversations from Evolution", lastError);
  }
  return [];
}

export async function fetchMessagesFromEvolution(number: string) {
  if (!isConfigured()) return [];

  const payload = await evolutionRequest(`/chat/findMessages/${EVOLUTION_INSTANCE}/${encodeURIComponent(number)}`);
  const arrays = findArrays(payload);
  const mapped = arrays.flatMap((arr) => arr.map((item) => mapRawMessage(item, number)).filter(Boolean) as EvolutionMappedMessage[]);

  const unique = new Map<string, EvolutionMappedMessage>();
  mapped.forEach((item) => unique.set(item.id, item));
  return Array.from(unique.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

export function evolutionIsConfigured() {
  return isConfigured();
}
