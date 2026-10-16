import { NextRequest } from "next/server";
import { prisma, Prisma } from "@/lib/prisma";

export interface WebhookRequestLogEntry {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  route: string;
  source: string;
  status: number;
  ok: boolean;
  ip: string | null;
  userAgent: string | null;
  payload: unknown;
  headers: Record<string, string>;
}

export interface WebhookRequestLogFilters {
  limit?: number;
  route?: string;
  source?: string;
  status?: number;
  ok?: boolean;
  since?: Date;
}

// Formato da linha retornada pelo Prisma (evita depender do client gerado nos testes)
type WebhookLogRow = {
  id: string;
  createdAt: Date;
  method: string;
  path: string;
  route: string;
  source: string;
  status: number;
  ok: boolean;
  ip: string | null;
  userAgent: string | null;
  payload: unknown;
  headers: unknown;
};

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_LIST_LIMIT = 100;

// Limite de registros mantidos no banco; os mais antigos são removidos
function resolveMaxEntries(): number {
  const raw = Number(process.env.WEBHOOK_LOG_MAX_ENTRIES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_ENTRIES;
}

// Encurta valores para caber nas colunas, evitando falha de insert em payloads longos
function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

// Mantém apenas os headers relevantes, evitando persistir dados sensíveis
function safeHeaders(request: NextRequest) {
  const keys = ["content-type", "user-agent", "x-forwarded-for", "x-real-ip", "x-webhook-source", "x-provider"];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function toEntry(row: WebhookLogRow): WebhookRequestLogEntry {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    method: row.method,
    path: row.path,
    route: row.route,
    source: row.source,
    status: row.status,
    ok: row.ok,
    ip: row.ip,
    userAgent: row.userAgent,
    payload: row.payload,
    headers: (row.headers ?? {}) as Record<string, string>
  };
}

// Remove do banco os registros além do limite configurado
async function pruneOverflow() {
  const overflow = await prisma.webhookRequestLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: resolveMaxEntries(),
    select: { id: true }
  });

  if (overflow.length > 0) {
    await prisma.webhookRequestLog.deleteMany({
      where: { id: { in: overflow.map((row) => row.id) } }
    });
  }
}

/** Persiste a chamada externa recebida em um endpoint público de webhook. */
export async function logWebhookRequest(input: {
  request: NextRequest;
  payload: unknown;
  route: string;
  source?: string;
  status: number;
}): Promise<WebhookRequestLogEntry | null> {
  const ip = input.request.headers.get("x-forwarded-for") || input.request.headers.get("x-real-ip");

  try {
    const row = await prisma.webhookRequestLog.create({
      data: {
        method: truncate(input.request.method, 10) ?? "GET",
        path: truncate(input.request.nextUrl.pathname, 255) ?? "/",
        route: truncate(input.route, 80) ?? "webhook",
        source: truncate(input.source || "webhook", 40) ?? "webhook",
        status: input.status,
        ok: input.status >= 200 && input.status < 300,
        ip: truncate(ip, 64),
        userAgent: truncate(input.request.headers.get("user-agent"), 255),
        payload: input.payload == null ? Prisma.JsonNull : (input.payload as Prisma.InputJsonValue),
        headers: safeHeaders(input.request) as Prisma.InputJsonValue
      }
    });

    await pruneOverflow();

    return toEntry(row as WebhookLogRow);
  } catch (error) {
    console.warn("[webhook-logs] Falha ao persistir log de webhook", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

/** Lista os logs persistidos, do mais recente para o mais antigo, com filtros opcionais. */
export async function listWebhookRequestLogs(filters: WebhookRequestLogFilters = {}): Promise<WebhookRequestLogEntry[]> {
  const limit = Math.max(1, Math.min(Math.floor(filters.limit ?? DEFAULT_LIST_LIMIT), resolveMaxEntries()));

  const rows = await prisma.webhookRequestLog.findMany({
    where: {
      ...(filters.route ? { route: filters.route } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(typeof filters.status === "number" && Number.isFinite(filters.status) ? { status: filters.status } : {}),
      ...(typeof filters.ok === "boolean" ? { ok: filters.ok } : {}),
      ...(filters.since ? { createdAt: { gte: filters.since } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return rows.map((row) => toEntry(row as WebhookLogRow));
}

/** Apaga todos os logs persistidos. */
export async function clearWebhookRequestLogs(): Promise<number> {
  const result = await prisma.webhookRequestLog.deleteMany({});
  return result.count;
}
