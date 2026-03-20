import { prisma } from "@/lib/prisma";
import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";
import { isN8nConfigured, requestN8n, requestN8nChatPath, resolvePath } from "@/server/services/n8n-adapter";
import { isUazapiConfigured, requestUazapi } from "@/server/services/uazapi-adapter";

export interface WhatsAppContactRecord {
  id: string;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  instanceId: string | null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeUtf8(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFC");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(normalized);
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const trimmed = decoded.trim();
  return trimmed || null;
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

function mapUazapiContact(item: unknown, instanceId?: string | null): WhatsAppContactRecord | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const jid = normalizeText(raw.jid);
  if (!jid) return null;
  const now = new Date().toISOString();
  return {
    id: jid,
    remoteJid: jid,
    pushName: normalizeUtf8(raw.contactName) || normalizeUtf8(raw.contact_name) || normalizeUtf8(raw.contact_FirstName),
    profilePicUrl: null,
    createdAt: now,
    updatedAt: now,
    instanceId: instanceId || null
  };
}

async function ensureWhatsContactsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id TEXT PRIMARY KEY,
      remote_jid TEXT NOT NULL,
      push_name TEXT,
      profile_pic_url TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      instance_id TEXT,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_remote_jid
    ON whatsapp_contacts(remote_jid)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_id
    ON whatsapp_contacts(instance_id)
  `);
}

async function persistContacts(contacts: WhatsAppContactRecord[]) {
  for (const contact of contacts) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO whatsapp_contacts (
          id,
          remote_jid,
          push_name,
          profile_pic_url,
          created_at,
          updated_at,
          instance_id,
          synced_at
        )
        VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          remote_jid = EXCLUDED.remote_jid,
          push_name = EXCLUDED.push_name,
          profile_pic_url = EXCLUDED.profile_pic_url,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          instance_id = EXCLUDED.instance_id,
          synced_at = NOW()
      `,
      contact.id,
      contact.remoteJid,
      contact.pushName,
      contact.profilePicUrl,
      contact.createdAt,
      contact.updatedAt,
      contact.instanceId
    );
  }
}

export async function findWhatsAppContactByPhone(phone: string): Promise<WhatsAppContactRecord | null> {
  await ensureWhatsContactsTable();
  const normalizedPhone = phone.replace(/\D/g, "");

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    remote_jid: string;
    push_name: string | null;
    profile_pic_url: string | null;
    created_at: Date;
    updated_at: Date;
    instance_id: string | null;
  }>>(
    `
      SELECT id, remote_jid, push_name, profile_pic_url, created_at, updated_at, instance_id
      FROM whatsapp_contacts
      WHERE remote_jid LIKE $1
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    `%${normalizedPhone}%`
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    remoteJid: row.remote_jid,
    pushName: row.push_name,
    profilePicUrl: row.profile_pic_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    instanceId: row.instance_id
  };
}

export async function listSyncedWhatsAppContacts(limit = 300): Promise<WhatsAppContactRecord[]> {
  await ensureWhatsContactsTable();

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    remote_jid: string;
    push_name: string | null;
    profile_pic_url: string | null;
    created_at: Date;
    updated_at: Date;
    instance_id: string | null;
  }>>(
    `
      SELECT id, remote_jid, push_name, profile_pic_url, created_at, updated_at, instance_id
      FROM whatsapp_contacts
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    Math.max(1, Math.min(limit, 2000))
  );

  return rows.map((row) => ({
    id: row.id,
    remoteJid: row.remote_jid,
    pushName: row.push_name,
    profilePicUrl: row.profile_pic_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    instanceId: row.instance_id
  }));
}

export async function syncWhatsAppContactsFromN8n(config?: WhatsAppRuntimeConfig | null) {
  await ensureWhatsContactsTable();

  if (!isN8nConfigured(config)) {
    throw new Error("Integração n8n não configurada para sincronização de contatos.");
  }

  const webhookUrl = config?.n8nWebhookUrl || process.env.N8N_CHAT_WEBHOOK_URL;

  let payload: any;
  let usedEndpoint = "";

  if (webhookUrl && webhookUrl.includes("/webhook")) {
    const baseUrl = webhookUrl.split("/webhook")[0] + "/webhook";
    usedEndpoint = `${baseUrl}/wa/baileys/action/contacts`;

    try {
      payload = await requestN8n(usedEndpoint, config, { method: "GET" });
    } catch (error) {
      console.warn(`Falha ao sincronizar via endpoint dinâmico (${usedEndpoint}), tentando fallback...`, error);
    }
  }

  if (!payload) {
    const relPath = resolvePath(config, "contacts");
    usedEndpoint = relPath;
    payload = await requestN8nChatPath(relPath, config, { method: "GET" });
  }

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.contacts)
        ? payload.contacts
        : [];

  const contacts = rawList.map(mapIncomingContact).filter(Boolean) as WhatsAppContactRecord[];
  await persistContacts(contacts);

  return {
    provider: "n8n",
    endpoint: usedEndpoint,
    totalReceived: rawList.length,
    totalSaved: contacts.length
  };
}

export async function syncWhatsAppContactsFromUazapi(config?: WhatsAppRuntimeConfig | null) {
  await ensureWhatsContactsTable();

  if (!isUazapiConfigured(config)) {
    throw new Error("Integração UAZAPI não configurada para sincronização de contatos.");
  }

  const statusPayload = await requestUazapi({ pathOrUrl: "/instance/status", method: "GET" }, config).catch(() => null);
  const instanceId = normalizeText((statusPayload as any)?.instance?.id) || normalizeText((statusPayload as any)?.instance?.name) || null;

  let usedEndpoint = "/contacts/list";
  let totalReceived = 0;
  let totalSaved = 0;
  let page = 1;
  const pageSize = 1000;

  try {
    while (true) {
      const payload = await requestUazapi({ pathOrUrl: "/contacts/list", method: "POST", body: { page, pageSize } }, config);
      const rawList: unknown[] = Array.isArray((payload as any)?.contacts) ? (payload as any).contacts : [];
      const pagination = (payload as any)?.pagination as Record<string, unknown> | undefined;
      const hasNextPage = Boolean((pagination as any)?.hasNextPage);

      totalReceived += rawList.length;
      const contacts = rawList.map((item: unknown) => mapUazapiContact(item, instanceId)).filter(Boolean) as WhatsAppContactRecord[];
      totalSaved += contacts.length;
      await persistContacts(contacts);

      if (!hasNextPage || rawList.length === 0) break;
      page += 1;
      if (page > 10_000) break;
    }
  } catch (error) {
    try {
      usedEndpoint = "/contacts";
      const payload = await requestUazapi({ pathOrUrl: "/contacts", method: "GET" }, config);
      const rawList: unknown[] = Array.isArray(payload) ? payload : [];
      totalReceived = rawList.length;
      const contacts = rawList.map((item: unknown) => mapUazapiContact(item, instanceId)).filter(Boolean) as WhatsAppContactRecord[];
      totalSaved = contacts.length;
      await persistContacts(contacts);
    } catch (fallbackError) {
      console.error("UAZAPI contacts sync failed", { error, fallbackError, usedEndpoint });
      throw fallbackError instanceof Error ? fallbackError : new Error("Falha ao sincronizar contatos via UAZAPI");
    }
  }

  return {
    provider: "uazapi",
    endpoint: usedEndpoint,
    totalReceived,
    totalSaved
  };
}

export async function syncWhatsAppContacts(config?: WhatsAppRuntimeConfig | null) {
  const provider = config?.whatsappProvider || (isUazapiConfigured(config) ? "uazapi" : "n8n");

  if (provider === "uazapi") {
    return syncWhatsAppContactsFromUazapi(config);
  }

  return syncWhatsAppContactsFromN8n(config);
}

export async function syncSingleContactByPhone(phone: string, config?: WhatsAppRuntimeConfig | null) {
  await syncWhatsAppContacts(config);
  return findWhatsAppContactByPhone(phone);
}
