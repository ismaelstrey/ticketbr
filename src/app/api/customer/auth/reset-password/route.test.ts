import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordMock, consumeMock, writeAuditLogMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  consumeMock: vi.fn(),
  writeAuditLogMock: vi.fn()
}));

vi.mock("@/server/services/password-reset", () => ({
  resetCustomerPassword: resetPasswordMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
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
  return new Request("http://localhost/api/customer/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(body)
  });
}

describe("POST /api/customer/auth/reset-password", () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
    consumeMock.mockReset();
    writeAuditLogMock.mockReset();
    consumeMock.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 29,
      limit: 30,
      resetAt: 2000000000000
    });
    resetPasswordMock.mockResolvedValue({ ok: true, userId: "u1" });
  });

  it("retorna 200 e registra auditoria quando a senha é redefinida", async () => {
    const res = await POST(makeRequest({ token: "abc123", password: "novaSenha123" }));

    expect(res.status).toBe(200);
    expect(resetPasswordMock).toHaveBeenCalledWith("abc123", "novaSenha123");
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 400 quando o token não é informado", async () => {
    const res = await POST(makeRequest({ token: "", password: "novaSenha123" }));

    expect(res.status).toBe(400);
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a senha é curta demais", async () => {
    const res = await POST(makeRequest({ token: "abc123", password: "123" }));

    expect(res.status).toBe(400);
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o token é inválido ou expirado", async () => {
    resetPasswordMock.mockResolvedValueOnce({ ok: false, reason: "INVALID_TOKEN" });

    const res = await POST(makeRequest({ token: "expirado", password: "novaSenha123" }));

    expect(res.status).toBe(400);
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });
});
