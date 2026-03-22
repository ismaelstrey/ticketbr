import { prisma } from "@/lib/prisma";

export interface ChatInteractionPreferences {
  enableSound: boolean;
  enableAlert: boolean;
  preferredChannel: "whatsapp" | "email";
}

const CHAT_PREFERENCES_PREFIX = "chat_interaction_preferences:";

export const defaultChatInteractionPreferences: ChatInteractionPreferences = {
  enableSound: true,
  enableAlert: false,
  preferredChannel: "whatsapp"
};

function normalizePreferences(input: unknown): ChatInteractionPreferences {
  if (!input || typeof input !== "object") return defaultChatInteractionPreferences;
  const raw = input as Record<string, unknown>;
  return {
    enableSound: raw.enableSound === undefined ? defaultChatInteractionPreferences.enableSound : Boolean(raw.enableSound),
    enableAlert: raw.enableAlert === undefined ? defaultChatInteractionPreferences.enableAlert : Boolean(raw.enableAlert),
    preferredChannel: raw.preferredChannel === "email" ? "email" : "whatsapp"
  };
}

async function ensureRuntimeSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_runtime_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function buildPreferenceKey(userId: string) {
  return `${CHAT_PREFERENCES_PREFIX}${userId}`;
}

export async function getChatInteractionPreferences(userId: string): Promise<ChatInteractionPreferences> {
  await ensureRuntimeSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: unknown }>>(
    `SELECT value FROM app_runtime_settings WHERE key = $1 LIMIT 1`,
    buildPreferenceKey(userId)
  );

  return normalizePreferences(rows?.[0]?.value);
}

export async function saveChatInteractionPreferences(userId: string, input: unknown): Promise<ChatInteractionPreferences> {
  await ensureRuntimeSettingsTable();
  const preferences = normalizePreferences(input);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO app_runtime_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    buildPreferenceKey(userId),
    JSON.stringify(preferences)
  );

  return preferences;
}
