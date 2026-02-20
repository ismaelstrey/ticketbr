import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const compareMock = vi.fn();
const loginMock = vi.fn();
const consumeMock = vi.fn();
const resetMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: compareMock,
}));

vi.mock("@/lib/auth", () => ({
  login: loginMock,
}));

vi.mock("@/lib/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rateLimit")>("@/lib/rateLimit");
  return {
    ...actual,
    loginRateLimiter: {
      consume: consumeMock,
      reset: resetMock,
    },
  };
});

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    findUniqueMock.mockReset();
    compareMock.mockReset();
    loginMock.mockReset();
    consumeMock.mockReset();
    resetMock.mockReset();

    consumeMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      limit: 5,
      resetAt: 2000000000000,
    });
  });

  it("returns 429 with retry and rate headers when blocked", async () => {
    consumeMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 120,
      remaining: 0,
      limit: 5,
      resetAt: 2000000000000,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "a@a.com", password: "x" }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain("Muitas tentativas");
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("returns 401 for invalid credentials and keeps rate headers", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "wrong@user.com", password: "123" }));

    expect(res.status).toBe(401);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("returns 200 on success and resets limiter", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "ok@user.com",
      name: "User",
      role: "ADMIN",
      password: "hashed",
    });
    compareMock.mockResolvedValueOnce(true);
    loginMock.mockResolvedValueOnce("token");

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(
        { email: "ok@user.com", password: "123" },
        { "x-forwarded-for": "203.0.113.10" }
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe("ok@user.com");
    expect(resetMock).toHaveBeenCalledWith("203.0.113.10");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
  });
});
