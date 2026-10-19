import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestResetMock, consumeMock } = vi.hoisted(() => ({
  requestResetMock: vi.fn(),
  consumeMock: vi.fn()
}));

vi.mock("@/server/services/password-reset", () => ({
  requestCustomerPasswordReset: requestResetMock
}));

vi.mock("@/lib/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rateLimit")>("@/lib/rateLimit");
  return {
    ...actual,
    sensitiveRouteRateLimiter: {
      consume: consumeMock,
      reset: vi.fn()
    }
  };
});

import { POST } from "./route";

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/customer/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(body)
  });
}

describe("POST /api/customer/auth/forgot-password", () => {
  beforeEach(() => {
    requestResetMock.mockReset();
    consumeMock.mockReset();
    consumeMock.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 29,
      limit: 30,
      resetAt: 2000000000000
    });
    requestResetMock.mockResolvedValue({ ok: true });
  });

  it("retorna 200 com mensagem genérica e dispara o serviço", async () => {
    const res = await POST(makeRequest({ email: "cli@user.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("Se o e-mail estiver cadastrado");
    expect(requestResetMock).toHaveBeenCalledWith("cli@user.com");
  });

  it("retorna 400 quando o e-mail não é informado", async () => {
    const res = await POST(makeRequest({ email: "" }));

    expect(res.status).toBe(400);
    expect(requestResetMock).not.toHaveBeenCalled();
  });

  it("retorna 429 quando o limite é excedido sem chamar o serviço", async () => {
    consumeMock.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 30,
      remaining: 0,
      limit: 30,
      resetAt: 2000000000000
    });

    const res = await POST(makeRequest({ email: "cli@user.com" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(requestResetMock).not.toHaveBeenCalled();
  });

  it("mantém resposta genérica (200) quando o e-mail não existe", async () => {
    requestResetMock.mockResolvedValueOnce({ ok: true, skipped: true });

    const res = await POST(makeRequest({ email: "naoexiste@user.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("Se o e-mail estiver cadastrado");
  });
});
