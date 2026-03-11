import { prisma } from "@/lib/prisma";
import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";
import { isN8nConfigured, requestN8nChatPath, resolvePath } from "@/server/services/n8n-adapter";

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

export async function findWhatsAppContactByPhone(phone: string): Promise<WhatsAppContactRecord | null> {
  await ensureWhatsContactsTable();
  const normalizedPhone = phone.replace(/\D/g, "");
  
  // Try to find by remote_jid containing the phone number
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

  // Assumindo que o path para contatos é /todos/contatos ou configurável
  // Por padrão vamos usar uma convenção baseada nos webhooks se não houver config específica
  // Ou podemos usar resolvePath se adicionarmos "contacts" ao whatsapp-settings.ts
  // Como não temos "contacts" no settings, vamos usar a convenção de adicionar /todos/contatos ao webhook base
  
  // Mas como agora temos requestN8nChatPath que lida com a lógica de resolução, podemos tentar usar um caminho relativo.
  // Vamos tentar "/todos/contatos" que parece ser o padrão do projeto
  
  const payload = await requestN8nChatPath("/todos/contatos", config, { method: "GET" });

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.contacts)
        ? payload.contacts
        : [];

  const contacts = rawList.map(mapIncomingContact).filter(Boolean) as WhatsAppContactRecord[];

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

  return {
    endpoint: "/todos/contatos",
    totalReceived: rawList.length,
    totalSaved: contacts.length
  };
}

export async function syncSingleContactByPhone(phone: string, config?: WhatsAppRuntimeConfig | null) {
  // Trigger full sync to ensure we have the latest data
  // N8N doesn't seem to have a single contact endpoint easily accessible without custom workflow
  // So we sync all and then search locally
  await syncWhatsAppContactsFromN8n(config);
  return findWhatsAppContactByPhone(phone);
}
