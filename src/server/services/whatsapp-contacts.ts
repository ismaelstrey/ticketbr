import { prisma } from "@/lib/prisma";
import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";

export interface WhatsAppContactRecord {
  id: string;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  instanceId: string | null;
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function buildUrl(base: string, path: string) {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function extractJidPhone(remoteJid?: string | null) {
  if (!remoteJid) return "";
  return normalizePhone(remoteJid.split("@")[0] || "");
}

function isPhoneMatch(inputPhone: string, jidPhone: string) {
  if (!inputPhone || !jidPhone) return false;
  return jidPhone === inputPhone || jidPhone.endsWith(inputPhone) || inputPhone.endsWith(jidPhone);
}

export function resolveContactsEndpoint(config?: WhatsAppRuntimeConfig | null) {
  const webhookUrl = config?.n8nWebhookUrl?.trim() || "";
  const n8nBase = config?.n8nBaseUrl?.trim() || "";
  let finalUrl = "";

  if (webhookUrl && isAbsoluteUrl(webhookUrl)) {
    const webhookRoot = webhookUrl.replace(/\/[^/]+$/, "");
    if (!webhookRoot.includes("/webhook")) {
      finalUrl = buildUrl(webhookRoot, "/webhook/todos/contatos");
    } else {
      finalUrl = buildUrl(webhookRoot, "/todos/contatos");
    }
  } else if (n8nBase && isAbsoluteUrl(n8nBase)) {
    if (n8nBase.includes("/webhook") || n8nBase.includes("/webhook-test")) {
      finalUrl = buildUrl(n8nBase, "/todos/contatos");
    } else {
      finalUrl = buildUrl(n8nBase, "/webhook/todos/contatos");
    }
  }

  if (!finalUrl) {
    throw new Error("Integração n8n não configurada para sincronização de contatos.");
  }

  if (config?.n8nUseTestWebhook) {
    return finalUrl.replace("/webhook/", "/webhook-test/");
  }
  return finalUrl.replace("/webhook-test/", "/webhook/");
}

function mapIncomingContact(item: unknown): WhatsAppContactRecord | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const id = normalizeText(raw.id);
  const remoteJid = normalizeText(raw.remoteJid);
  if (!id || !remoteJid) return null;

  const createdAt = normalizeText(raw.createdAt) || new Date().toISOString();
  const updatedAt = normalizeText(raw.updatedAt) || createdAt;

  return {
    id,
    remoteJid,
    pushName: normalizeText(raw.pushName),
    profilePicUrl: normalizeText(raw.profilePicUrl),
    createdAt,
    updatedAt,
    instanceId: normalizeText(raw.instanceId)
  };
}

function extractRawContacts(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    const flattened: unknown[] = [];
    for (const item of payload) {
      if (Array.isArray(item)) {
        flattened.push(...item);
        continue;
      }
      if (item && typeof item === "object") {
        const raw = item as Record<string, unknown>;
        if (Array.isArray(raw.data)) {
          flattened.push(...raw.data);
          continue;
        }
      }
      flattened.push(item);
    }
    return flattened;
  }

  if (payload && typeof payload === "object") {
    const raw = payload as Record<string, unknown>;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.contacts)) return raw.contacts;
  }

  return [];
}

export async function findWhatsAppContactByPhone(phone: string): Promise<WhatsAppContactRecord | null> {
  const normalizedPhone = normalizePhone(phone);

  const rows = await prisma.whatsAppContact.findMany({
    where: { remoteJid: { contains: "@" } },
    orderBy: { updatedAt: "desc" },
    take: 2000
  });

  const row = rows.find((item) => isPhoneMatch(normalizedPhone, extractJidPhone(item.remoteJid)));
  if (!row) return null;

  return {
    id: row.id,
    remoteJid: row.remoteJid,
    pushName: row.pushName,
    profilePicUrl: row.profilePicUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    instanceId: row.instanceId
  };
}

export async function listSyncedWhatsAppContacts(limit = 300): Promise<WhatsAppContactRecord[]> {
  const rows = await prisma.whatsAppContact.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.max(1, Math.min(limit, 2000))
  });

  return rows.map((row) => ({
    id: row.id,
    remoteJid: row.remoteJid,
    pushName: row.pushName,
    profilePicUrl: row.profilePicUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    instanceId: row.instanceId
  }));
}

export async function syncWhatsAppContactsFromN8n(config?: WhatsAppRuntimeConfig | null) {
  const endpoint = resolveContactsEndpoint(config);
  const apiKey = config?.n8nApiKey || process.env.N8N_CHAT_API_KEY;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-N8N-API-KEY": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Falha ao consultar endpoint de contatos (${response.status})`);
  }

  const rawList = extractRawContacts(payload);
  const contacts = rawList.map(mapIncomingContact).filter(Boolean) as WhatsAppContactRecord[];

  for (const contact of contacts) {
    await prisma.whatsAppContact.upsert({
      where: { id: contact.id },
      create: {
        id: contact.id,
        remoteJid: contact.remoteJid,
        pushName: contact.pushName,
        profilePicUrl: contact.profilePicUrl,
        createdAt: new Date(contact.createdAt),
        updatedAt: new Date(contact.updatedAt),
        instanceId: contact.instanceId,
      },
      update: {
        remoteJid: contact.remoteJid,
        pushName: contact.pushName,
        profilePicUrl: contact.profilePicUrl,
        createdAt: new Date(contact.createdAt),
        updatedAt: new Date(contact.updatedAt),
        instanceId: contact.instanceId,
        syncedAt: new Date()
      }
    });
  }

  return {
    endpoint,
    totalReceived: rawList.length,
    totalSaved: contacts.length
  };
}

export async function syncSingleContactByPhone(phone: string, config?: WhatsAppRuntimeConfig | null) {
  await syncWhatsAppContactsFromN8n(config);
  return findWhatsAppContactByPhone(phone);
}
