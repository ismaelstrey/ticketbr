import { NextRequest } from "next/server";

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

type Store = {
  entries: WebhookRequestLogEntry[];
};

const MAX_ENTRIES = 200;

function getStore(): Store {
  const globalValue = globalThis as typeof globalThis & { __ticketbrWebhookLogs?: Store };
  if (!globalValue.__ticketbrWebhookLogs) {
    globalValue.__ticketbrWebhookLogs = { entries: [] };
  }
  return globalValue.__ticketbrWebhookLogs;
}

function safeHeaders(request: NextRequest) {
  const keys = ["content-type", "user-agent", "x-forwarded-for", "x-real-ip", "x-webhook-source", "x-provider"];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function logWebhookRequest(input: {
  request: NextRequest;
  payload: unknown;
  route: string;
  source?: string;
  status: number;
}) {
  const store = getStore();
  const entry: WebhookRequestLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    method: input.request.method,
    path: input.request.nextUrl.pathname,
    route: input.route,
    source: input.source || "webhook",
    status: input.status,
    ok: input.status >= 200 && input.status < 300,
    ip: input.request.headers.get("x-forwarded-for") || input.request.headers.get("x-real-ip"),
    userAgent: input.request.headers.get("user-agent"),
    payload: input.payload,
    headers: safeHeaders(input.request)
  };

  store.entries.unshift(entry);
  if (store.entries.length > MAX_ENTRIES) {
    store.entries.length = MAX_ENTRIES;
  }

  return entry;
}

export function listWebhookRequestLogs(limit = 100) {
  return getStore().entries.slice(0, Math.max(1, Math.min(limit, MAX_ENTRIES)));
}

export function clearWebhookRequestLogs() {
  getStore().entries = [];
}
