import { describe, expect, it, vi, beforeEach } from "vitest";

const queryRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns 200 and ok when database is available", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(body.status).toBe("ok");
    expect(typeof body.requestId).toBe("string");
    expect(body.dependencies.database.status).toBe("up");
    expect(typeof body.dependencies.database.latencyMs).toBe("number");
    expect(typeof body.uptimeSeconds).toBe("number");
  });

  it("returns 503 and degraded when database is unavailable", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("db down"));
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(body.status).toBe("degraded");
    expect(typeof body.requestId).toBe("string");
    expect(body.dependencies.database.status).toBe("down");
    expect(typeof body.dependencies.database.latencyMs).toBe("number");
  });
});
