import { NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error";

export type RequestContext = {
  requestId: string;
  startedAt: number;
};

export function createRequestContext(): RequestContext {
  return {
    requestId: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString(),
    startedAt: Date.now(),
  };
}

export function elapsedMs(context: RequestContext): number {
  return Date.now() - context.startedAt;
}

export async function timedCheck<T>(fn: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const value = await fn();
    return {
      ok: true as const,
      value,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false as const,
      error,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export function logRouteEvent(
  scope: string,
  level: LogLevel,
  context: RequestContext,
  payload: Record<string, unknown> = {}
) {
  const logPayload = {
    requestId: context.requestId,
    ms: elapsedMs(context),
    ...payload,
  };

  if (level === "error") {
    console.error(scope, logPayload);
    return;
  }

  if (level === "warn") {
    console.warn(scope, logPayload);
    return;
  }

  console.info(scope, logPayload);
}

export function jsonWithRequestId(
  body: Record<string, unknown>,
  context: RequestContext,
  init: ResponseInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set("x-request-id", context.requestId);

  return NextResponse.json(
    { ...body, requestId: context.requestId },
    {
      ...init,
      headers,
    }
  );
}
