import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCustomerContextMock = vi.fn();
const getCustomerTicketsDashboardMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/server/services/customer-dashboard", () => ({
  getCustomerTicketsDashboard: getCustomerTicketsDashboardMock
}));

describe("/api/customer/dashboard/tickets", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    getCustomerTicketsDashboardMock.mockReset();
  });

  it("GET usa o solicitante da sessao do cliente", async () => {
    requireCustomerContextMock.mockResolvedValueOnce({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });
    getCustomerTicketsDashboardMock.mockResolvedValueOnce({
      data: {
        window: { from: "2026-04-01T00:00:00.000Z", to: "2026-04-08T00:00:00.000Z" },
        generatedAt: "2026-04-08T00:00:00.000Z",
        kpis: { openTotal: 1, inProgress: 0, doneInRange: 0, overdue: 0, atRisk: 0, avgResolutionHours: null, avgFirstResponseHours: null },
        charts: { volume: [], statusDonut: [], categoryBar: [], slaDonut: [] },
        tables: { criticalTickets: [] }
      }
    });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams("preset=7d&clientId=other") } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.kpis.openTotal).toBe(1);
    expect(getCustomerTicketsDashboardMock).toHaveBeenCalledWith("s1", { preset: "7d" });
  });

  it("GET retorna 401 quando nao autenticado", async () => {
    requireCustomerContextMock.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
