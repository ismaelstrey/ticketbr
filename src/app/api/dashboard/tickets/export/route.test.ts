import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/services/tickets-operational-dashboard", () => ({
  getTicketsOperationalDashboard: vi.fn()
}));

describe("GET /api/dashboard/tickets/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exporta json quando format=json", async () => {
    const svc = await import("@/server/services/tickets-operational-dashboard");
    (svc.getTicketsOperationalDashboard as any).mockResolvedValue({
      data: {
        window: { from: new Date().toISOString(), to: new Date().toISOString() },
        generatedAt: new Date().toISOString(),
        kpis: {
          openTotal: 1,
          openDeltaPct: null,
          inProgressByStatus: {},
          overdue: 0,
          avgResolutionHours: null,
          firstContactResolutionRate: null
        },
        charts: { statusDonut: [], topClients: [], volume: [], categoryTrend: [], heatmap: [] },
        tables: { criticalTickets: [], topAgents: [], topCategories: [] }
      }
    });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ format: "json" }) } } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.kpis.openTotal).toBe(1);
  }, 15_000);
});
