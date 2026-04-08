import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/services/tickets-operational-dashboard", () => ({
  getTicketsOperationalDashboard: vi.fn()
}));

describe("GET /api/dashboard/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna KPIs e gráficos", async () => {
    const svc = await import("@/server/services/tickets-operational-dashboard");
    (svc.getTicketsOperationalDashboard as any).mockResolvedValue({
      data: {
        window: { from: new Date().toISOString(), to: new Date().toISOString() },
        generatedAt: new Date().toISOString(),
        kpis: {
          openTotal: 10,
          openDeltaPct: 5.5,
          inProgressByStatus: { DOING: 3 },
          overdue: 2,
          avgResolutionHours: 4.2,
          firstContactResolutionRate: 0.5
        },
        charts: {
          statusDonut: [{ status: "TODO", count: 1 }],
          topClients: [{ clientId: null, clientName: "Acme", count: 2 }],
          volume: [{ x: new Date().toISOString(), y: 3 }],
          categoryTrend: [{ x: new Date().toISOString(), category: "Rede", count: 1 }],
          heatmap: [{ dow: 1, hour: 9, count: 2 }]
        },
        tables: {
          criticalTickets: [],
          topAgents: [],
          topCategories: []
        }
      }
    });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ preset: "7d" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.kpis.openTotal).toBe(10);
    expect(Array.isArray(body.data.charts.statusDonut)).toBe(true);
  });
});

