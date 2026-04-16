import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptJson, encryptJson, type EncryptedPayload } from "@/lib/encryption";

export type StorageProvider = "aws" | "minio";

export type StorageAcl = "private" | "public-read";

export interface StorageRuntimeConfig {
  provider: StorageProvider;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  defaultAcl?: StorageAcl;
  retentionDays?: number;
}

export const STORAGE_CONFIG_COOKIE = "ticketbr_storage_cfg";
const STORAGE_CONFIG_DB_KEY = "storage_runtime_config";

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

export function encodeStorageConfigCookie(config: StorageRuntimeConfig) {
  return encodeURIComponent(JSON.stringify(config));
}

export function normalizeStorageConfig(input: unknown): StorageRuntimeConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const provider = String(raw.provider ?? "").trim();
  if (provider !== "aws" && provider !== "minio") return null;

  const accessKeyId = String(raw.accessKeyId ?? "").trim();
  const secretAccessKey = String(raw.secretAccessKey ?? "").trim();
  const region = String(raw.region ?? "").trim();
  const bucket = String(raw.bucket ?? "").trim();
  const endpoint = String(raw.endpoint ?? "").trim() || undefined;
  const defaultAcl = String(raw.defaultAcl ?? "").trim();
  const forcePathStyle = raw.forcePathStyle === undefined ? undefined : Boolean(raw.forcePathStyle);

  const retentionDaysRaw = raw.retentionDays;
  const retentionDays = retentionDaysRaw === undefined || retentionDaysRaw === null || retentionDaysRaw === ""
    ? undefined
    : Number(retentionDaysRaw);

  const config: StorageRuntimeConfig = {
    provider,
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint,
    forcePathStyle,
    defaultAcl: defaultAcl === "public-read" ? "public-read" : "private",
    retentionDays: typeof retentionDays === "number" && Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : undefined
  };

  if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.bucket) return null;
  if (config.provider === "minio" && !config.endpoint) return null;
  return config;
}

export function decodeStorageConfigCookie(value?: string): StorageRuntimeConfig | null {
  if (!value) return null;
  const decoded = safeJsonParse(decodeURIComponent(value));
  return normalizeStorageConfig(decoded);
}

export function getStorageConfigFromRequest(request: NextRequest): StorageRuntimeConfig | null {
  const bodyConfig = (request as any).__ticketbrBodyConfig as StorageRuntimeConfig | undefined;
  if (bodyConfig) return bodyConfig;

  const cookieValue = request.cookies.get(STORAGE_CONFIG_COOKIE)?.value;
  return decodeStorageConfigCookie(cookieValue);
}

export function sanitizeStorageConfig(config: StorageRuntimeConfig) {
  const accessKeyIdMasked = config.accessKeyId
    ? (config.accessKeyId.length > 8 ? `${config.accessKeyId.slice(0, 4)}••••${config.accessKeyId.slice(-4)}` : "••••")
    : undefined;

  const secretAccessKeyMasked = config.secretAccessKey
    ? (config.secretAccessKey.length > 8 ? `${config.secretAccessKey.slice(0, 4)}••••${config.secretAccessKey.slice(-4)}` : "••••")
    : undefined;

  return {
    provider: config.provider,
    region: config.region,
    bucket: config.bucket,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.forcePathStyle),
    defaultAcl: config.defaultAcl ?? "private",
    retentionDays: config.retentionDays ?? null,
    accessKeyIdMasked,
    secretAccessKeyMasked
  };
}

export async function getStorageConfigFromDatabase(): Promise<StorageRuntimeConfig | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: unknown }>>(
      `SELECT value FROM app_runtime_settings WHERE key = $1 LIMIT 1`,
      STORAGE_CONFIG_DB_KEY
    );

    const value = rows?.[0]?.value as any;
    const encrypted = value?.encrypted as EncryptedPayload | undefined;
    if (!encrypted) return null;

    const decrypted = decryptJson<unknown>(encrypted);
    return normalizeStorageConfig(decrypted);
  } catch {
    return null;
  }
}

export async function saveStorageConfigToDatabase(config: StorageRuntimeConfig) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_runtime_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const encrypted = encryptJson(config);
  const value = JSON.stringify({ encrypted });

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO app_runtime_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    STORAGE_CONFIG_DB_KEY,
    value
  );
}

export async function resolveStorageConfig(request: NextRequest, bodyConfig?: StorageRuntimeConfig | null) {
  const requestConfig = bodyConfig ?? getStorageConfigFromRequest(request);
  if (requestConfig) return requestConfig;
  return getStorageConfigFromDatabase();
}

