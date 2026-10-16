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

// Relatório sintético com tendência e categorias para a exportação
function reportFixture() {
  return {
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
      charts: { statusDonut: [], volume: [], topCategories: [{ category: "Rede", count: 7 }] },
      trend: [
        {
          date: "2026-05-01T00:00:00.000Z",
          openTotal: 12,
          doneTotal: 5,
          overdueTotal: 2,
          slaWarningTotal: 3,
          avgResolutionHours: 6.5,
          firstContactResolutionRate: 0.8
        }
      ],
      latestSnapshotAt: "2026-05-01T00:00:00.000Z"
    }
  };
}

describe("GET /api/reports/management/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStaffMock.mockResolvedValue(null);
    getManagementReportMock.mockResolvedValue(reportFixture());
  });

  it("exporta em XLSX com o content-type de planilha", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ format: "xlsx" }) } } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
  });

  it("exporta em PDF", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ format: "pdf" }) } } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("exporta em JSON quando solicitado", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ format: "json" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.kpis.openTotal).toBe(20);
  });

  it("bloqueia a exportação quando o acesso é negado", async () => {
    guardStaffMock.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ format: "xlsx" }) } } as any;
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(getManagementReportMock).not.toHaveBeenCalled();
  });
});
