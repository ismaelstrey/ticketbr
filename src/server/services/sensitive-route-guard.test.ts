import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sessão e rate limiter mockados para exercitar apenas a guarda de rotas administrativas
const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: () => getSessionMock()
}));

const consumeMock = vi.fn();
vi.mock("@/lib/rateLimit", () => ({
  sensitiveRouteRateLimiter: {
    consume: (...args: unknown[]) => consumeMock(...args)
  }
}));

import { enforceAdminRouteSecurity, withRateLimitHeaders, type GuardSuccess } from "./sensitive-route-guard";

const allowedRate = {
  allowed: true,
  retryAfterSeconds: 0,
  remaining: 29,
  limit: 30,
  resetAt: 1_800_000_000_000
};

const blockedRate = {
  allowed: false,
  retryAfterSeconds: 42,
  remaining: 0,
  limit: 30,
  resetAt: 1_800_000_000_000
};

function buildRequest(forwardedFor?: string) {
  return new Request("http://localhost/api/inventory", {
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : undefined
  });
}

describe("enforceAdminRouteSecurity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue(null);
    consumeMock.mockResolvedValue(allowedRate);
  });

  it("bloqueia com 429 quando o limite é excedido e informa Retry-After", async () => {
    consumeMock.mockResolvedValue(blockedRate);

    const result = await enforceAdminRouteSecurity(buildRequest("10.0.0.1"), "inventory");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
      expect(result.response.headers.get("Retry-After")).toBe("42");
      expect(result.response.headers.get("X-RateLimit-Limit")).toBe("30");
    }
  });

  it("responde 401 quando não há sessão válida", async () => {
    const result = await enforceAdminRouteSecurity(buildRequest("10.0.0.2"), "inventory");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: "Unauthorized" });
    }
  });

  it("responde 403 quando a sessão não é de administrador", async () => {
    getSessionMock.mockResolvedValue({ id: "ag1", role: "AGENT" });

    const result = await enforceAdminRouteSecurity(buildRequest(), "inventory");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({ error: "Forbidden" });
    }
  });

  it("libera a rota para administrador e devolve a sessão do ator", async () => {
    getSessionMock.mockResolvedValue({ id: "adm1", role: "ADMIN" });

    const result = (await enforceAdminRouteSecurity(buildRequest(), "inventory")) as GuardSuccess;
    expect(result.ok).toBe(true);
    expect(result.actorUserId).toBe("adm1");
    expect(result.session.role).toBe("ADMIN");
  });

  it("restringe o limite pela conta quando há sessão e pelo IP quando não há", async () => {
    getSessionMock.mockResolvedValue({ id: "adm1", role: "ADMIN" });
    await enforceAdminRouteSecurity(buildRequest("10.0.0.9"), "inventory");
    expect(consumeMock).toHaveBeenLastCalledWith("inventory:adm1");

    getSessionMock.mockResolvedValue(null);
    await enforceAdminRouteSecurity(buildRequest("10.0.0.9"), "inventory");
    expect(consumeMock).toHaveBeenLastCalledWith("inventory:10.0.0.9");
  });

  it("usa 'unknown' como chave de IP quando o cabeçalho encaminhado não existe", async () => {
    await enforceAdminRouteSecurity(buildRequest(), "inventory");
    expect(consumeMock).toHaveBeenLastCalledWith("inventory:unknown");
  });
});

describe("withRateLimitHeaders", () => {
  it("copia os cabeçalhos de rate limit para a resposta", () => {
    const response = NextResponse.json({ ok: true });
    const nextResponse = withRateLimitHeaders(response, allowedRate);

    expect(nextResponse.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(nextResponse.headers.get("X-RateLimit-Remaining")).toBe("29");
    expect(nextResponse.headers.get("X-RateLimit-Reset")).toBe(String(Math.floor(allowedRate.resetAt / 1000)));
    expect(nextResponse.headers.get("Retry-After")).toBeNull();
  });

  it("inclui Retry-After quando solicitado", () => {
    const response = NextResponse.json({ ok: true });
    const nextResponse = withRateLimitHeaders(response, blockedRate, true);

    expect(nextResponse.headers.get("Retry-After")).toBe("42");
  });
});
