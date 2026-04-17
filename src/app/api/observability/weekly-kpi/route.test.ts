import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getWeeklyCriticalFlowKpisMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock
}));

vi.mock("@/server/services/critical-flow-observability", () => ({
  getWeeklyCriticalFlowKpis: getWeeklyCriticalFlowKpisMock
}));

describe("GET /api/observability/weekly-kpi", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getWeeklyCriticalFlowKpisMock.mockReset();
  });

  it("retorna 401 sem sessao", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("retorna KPI semanal para usuario autenticado", async () => {
    getSessionMock.mockResolvedValueOnce({ id: "u1", name: "Agent" });
    getWeeklyCriticalFlowKpisMock.mockResolvedValueOnce({
      period: { start: "2026-04-10T00:00:00.000Z", end: "2026-04-17T00:00:00.000Z" },
      totals: { events: 2, success: 2, failure: 0 },
      stages: {}
    });

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totals.events).toBe(2);
    expect(body.requestId).toBeTruthy();
    expect(getWeeklyCriticalFlowKpisMock).toHaveBeenCalledTimes(1);
  });
});
