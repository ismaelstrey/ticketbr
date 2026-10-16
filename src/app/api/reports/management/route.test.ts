import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guardStaffMock = vi.fn();
const getManagementReportMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  guardStaff: guardStaffMock
}));

vi.mock("@/server/services/kpi-snapshots", () => ({
  getManagementReport: getManagementReportMock
}));

vi.mock("@/server/services/route-metrics-observability", () => ({
  recordRouteMetric: async () => {},
  trackRouteResponse: async (_route: string, _method: string, _context: unknown, response: Response) => response
}));

describe("GET /api/reports/management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStaffMock.mockResolvedValue(null);
    getManagementReportMock.mockResolvedValue({
      data: {
        window: {
          from: "2026-05-01T00:00:00.000Z",
          to: "2026-05-07T00:00:00.000Z",
          prevFrom: "2026-04-24T00:00:00.000Z",
          prevTo: "2026-05-01T00:00:00.000Z"
        },
        generatedAt: "2026-05-07T12:00:00.000Z",
        kpis: {
          openTotal: 20,
          openDeltaPct: 5,
          inProgressByStatus: { DOING: 2 },
          overdue: 4,
          avgResolutionHours: 5,
          firstContactResolutionRate: 0.9
        },
        previousKpis: {
          openTotal: 10,
          openDeltaPct: null,
          inProgressByStatus: {},
          overdue: 2,
          avgResolutionHours: 8,
          firstContactResolutionRate: 0.5
        },
        deltas: {
          openTotal: { absolute: 10, percent: 100 },
          overdue: { absolute: 2, percent: 100 },
          avgResolutionHours: { absolute: -3, percent: -37.5 },
          firstContactResolutionRate: { absolute: 0.4, percent: 80 }
        },
        charts: { statusDonut: [], volume: [], topCategories: [] },
        trend: [],
        latestSnapshotAt: null
      }
    });
  });

  it("retorna o relatório gerencial para sessão de staff", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ preset: "7d" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.kpis.openTotal).toBe(20);
    expect(body.data.deltas.openTotal.percent).toBe(100);
    expect(getManagementReportMock).toHaveBeenCalledWith({ preset: "7d" });
  });

  it("propaga a resposta de autorização quando o acesso é negado", async () => {
    guardStaffMock.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(getManagementReportMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o período é inválido", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ preset: "year" }) } } as any;
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(getManagementReportMock).not.toHaveBeenCalled();
  });
});
