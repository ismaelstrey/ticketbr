import { prisma } from "@/lib/prisma";
import type { NotificationType } from "../../../prisma/generated/enums";

// Chave usada na tabela app_runtime_settings (mesmo padrão das demais configurações)
const NOTIFICATION_PREFERENCES_DB_KEY = "notification_preferences";

// Tempo de vida do cache em memória: evita reler o banco a cada notificação de uma varredura
const CACHE_TTL_MS = 30_000;

// Tipos de notificação suportados, na ordem em que são exibidos na interface
export const NOTIFICATION_TYPE_ORDER: NotificationType[] = [
  "TICKET_STATUS_CHANGED",
  "TICKET_COMMENT",
  "TICKET_ASSIGNED",
  "SLA_WARNING",
  "SLA_BREACHED",
  "CONTRACT_EXPIRING",
  "CONTRACT_EXPIRED",
  "CONTRACT_CANCELLED"
];

export interface NotificationPreferences {
  // Canal in-app (sino e lista de notificações)
  inAppEnabled: boolean;
  // Canal externo de email
  emailEnabled: boolean;
  // Liga/desliga individual de cada tipo de evento
  types: Record<NotificationType, boolean>;
}

// Padrão: todos os canais e tipos habilitados (comportamento anterior ao recurso)
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  types: {
    TICKET_STATUS_CHANGED: true,
    TICKET_COMMENT: true,
    TICKET_ASSIGNED: true,
    SLA_WARNING: true,
    SLA_BREACHED: true,
    CONTRACT_EXPIRING: true,
    CONTRACT_EXPIRED: true,
    CONTRACT_CANCELLED: true
  }
};

let cache: { value: NotificationPreferences; expiresAt: number } | null = null;

/** Descarta o cache em memória (usado após salvar e nos testes). */
export function invalidateNotificationPreferencesCache() {
  cache = null;
}

/** Normaliza a entrada em preferências válidas, caindo nos padrões para campos ausentes. */
export function normalizeNotificationPreferences(input: unknown): NotificationPreferences {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawTypes = (raw.types && typeof raw.types === "object" ? raw.types : {}) as Record<string, unknown>;

  const toBooleanOr = (value: unknown, fallback: boolean) =>
    value === undefined || value === null ? fallback : Boolean(value);

  const types = {} as Record<NotificationType, boolean>;
  for (const tipo of NOTIFICATION_TYPE_ORDER) {
    types[tipo] = toBooleanOr(rawTypes[tipo], DEFAULT_NOTIFICATION_PREFERENCES.types[tipo]);
  }

  return {
    inAppEnabled: toBooleanOr(raw.inAppEnabled, DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled),
    emailEnabled: toBooleanOr(raw.emailEnabled, DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled),
    types
  };
}

/**
 * Lê as preferências de notificação do banco.
 * Nunca lança: em falha (tabela ausente, banco fora) devolve os padrões habilitados.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  let resolved = DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: unknown }>>(
      `SELECT value FROM app_runtime_settings WHERE key = $1 LIMIT 1`,
      NOTIFICATION_PREFERENCES_DB_KEY
    );

    if (rows?.[0]?.value) {
      resolved = normalizeNotificationPreferences(rows[0].value);
    }
  } catch {
    // Sem preferências persistidas: segue com o padrão (todos os canais/tipos ativos)
    resolved = DEFAULT_NOTIFICATION_PREFERENCES;
  }

  cache = { value: resolved, expiresAt: now + CACHE_TTL_MS };
  return resolved;
}

/** Persiste as preferências normalizadas e invalida o cache. */
export async function saveNotificationPreferences(input: unknown): Promise<NotificationPreferences> {
  const preferences = normalizeNotificationPreferences(input);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_runtime_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO app_runtime_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    NOTIFICATION_PREFERENCES_DB_KEY,
    JSON.stringify(preferences)
  );

  cache = { value: preferences, expiresAt: Date.now() + CACHE_TTL_MS };
  return preferences;
}

/** Atalho usado pelo serviço de notificações para saber se o tipo está habilitado. */
export function isNotificationTypeEnabled(
  preferences: NotificationPreferences,
  tipo: NotificationType
): boolean {
  return preferences.types[tipo] !== false;
}
