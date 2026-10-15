import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getOperationalRouteMetricsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock
}));

vi.mock("@/server/services/route-metrics-observability", () => ({
  getOperationalRouteMetrics: getOperationalRouteMetricsMock,
  trackRouteResponse: async (
    _route: string,
    _method: string,
    _context: unknown,
    response: Response
  ) => response
}));

describe("GET /api/observability/metrics", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getOperationalRouteMetricsMock.mockReset();
  });

  it("retorna 401 sem sessao", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const { GET } = await import("./route");

    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("retorna métricas operacionais para usuario autenticado", async () => {
    getSessionMock.mockResolvedValueOnce({ id: "u1", name: "Agent" });
    getOperationalRouteMetricsMock.mockResolvedValueOnce({
      period: { start: "2026-04-10T00:00:00.000Z", end: "2026-04-11T00:00:00.000Z" },
      windowHours: 24,
      totals: { requests: 3, success: 2, failure: 1, errorRate: 0.3333 },
      routes: []
    });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ hours: "12" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totals.requests).toBe(3);
    expect(body.requestId).toBeTruthy();
    expect(getOperationalRouteMetricsMock).toHaveBeenCalledWith(expect.any(Date), 12);
  });

  it("usa janela de 24h quando hours é inválido", async () => {
    getSessionMock.mockResolvedValueOnce({ id: "u1" });
    getOperationalRouteMetricsMock.mockResolvedValueOnce({
      period: { start: "2026-04-10T00:00:00.000Z", end: "2026-04-11T00:00:00.000Z" },
      windowHours: 24,
      totals: { requests: 0, success: 0, failure: 0, errorRate: null },
      routes: []
    });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ hours: "abc" }) } } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(getOperationalRouteMetricsMock).toHaveBeenCalledWith(expect.any(Date), 24);
  });
});
