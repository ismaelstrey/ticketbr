import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthLoginErrorSchema, AuthLoginSuccessSchema } from "./schemas";

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

describe("API Contract - POST /api/auth/login", () => {
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
      resetAt: 2_000_000_000_000,
    });
  });

  it("returns success payload with stable headers", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "ok@user.com",
      name: "User",
      role: "ADMIN",
      password: "hashed",
    });
    compareMock.mockResolvedValueOnce(true);
    loginMock.mockResolvedValueOnce("token");

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "ok@user.com", password: "123" }, { "x-forwarded-for": "203.0.113.10" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(AuthLoginSuccessSchema.safeParse(body).success).toBe(true);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("5");
  });

  it("returns error payload contract on invalid credentials", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "bad@user.com", password: "123" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(AuthLoginErrorSchema.safeParse(body).success).toBe(true);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("4");
  });
});
