import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const funcionarioFindUniqueMock = vi.fn();
const compareMock = vi.fn();
const loginMock = vi.fn();
const writeAuditLogMock = vi.fn();
const consumeMock = vi.fn();
const resetMock = vi.fn();
const lockStatusMock = vi.fn();
const registerFailureMock = vi.fn();
const lockResetMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    funcionario: { findUnique: funcionarioFindUniqueMock },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: compareMock,
}));

vi.mock("@/lib/auth", () => ({
  login: loginMock,
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/lib/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rateLimit")>("@/lib/rateLimit");
  return {
    ...actual,
    loginRateLimiter: {
      consume: consumeMock,
      reset: resetMock,
    },
    loginLockGuard: {
      status: lockStatusMock,
      registerFailure: registerFailureMock,
      reset: lockResetMock,
    },
  };
});

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/customer/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/customer/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    userFindUniqueMock.mockReset();
    funcionarioFindUniqueMock.mockReset();
    compareMock.mockReset();
    loginMock.mockReset();
    writeAuditLogMock.mockReset();
    consumeMock.mockReset();
    resetMock.mockReset();
    lockStatusMock.mockReset();
    registerFailureMock.mockReset();
    lockResetMock.mockReset();

    consumeMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      limit: 5,
      resetAt: 2000000000000,
    });
    lockStatusMock.mockResolvedValue({ locked: false, retryAfterSeconds: 0, lockUntil: 0, failures: 0 });
    registerFailureMock.mockResolvedValue({ locked: false, retryAfterSeconds: 0, lockUntil: 0, failures: 1 });
    lockResetMock.mockResolvedValue(undefined);
  });

  it("returns 200 on success and resets the rate limiter and lock guard", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "cli@user.com",
      name: "Cliente",
      role: "CUSTOMER",
      password: "hashed",
    });
    compareMock.mockResolvedValueOnce(true);
    funcionarioFindUniqueMock.mockResolvedValueOnce({ id: "f1", solicitante_id: "s1", isAdmin: false });
    loginMock.mockResolvedValueOnce("token");

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ email: "Cli@User.com", password: "123" }, { "x-forwarded-for": "203.0.113.7" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe("cli@user.com");
    expect(resetMock).toHaveBeenCalledWith("203.0.113.7");
    expect(lockResetMock).toHaveBeenCalledWith("cli@user.com");
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 and registers a failure for unknown users", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "none@user.com", password: "123" }));

    expect(res.status).toBe(401);
    expect(registerFailureMock).toHaveBeenCalledWith("none@user.com");
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("returns 429 without hitting the database when the account is locked", async () => {
    lockStatusMock.mockResolvedValueOnce({
      locked: true,
      retryAfterSeconds: 120,
      lockUntil: 2000000000000,
      failures: 5,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "locked@user.com", password: "123" }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain("Muitas tentativas");
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the credentials failure crosses the lock threshold", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "brute@user.com",
      name: "Cliente",
      role: "CUSTOMER",
      password: "hashed",
    });
    compareMock.mockResolvedValueOnce(false);
    registerFailureMock.mockResolvedValueOnce({
      locked: true,
      retryAfterSeconds: 60,
      lockUntil: 2000000000000,
      failures: 5,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "brute@user.com", password: "wrong" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});
