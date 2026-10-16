import { beforeEach, describe, expect, it, vi } from "vitest";

const dashboardMock = vi.fn();
const computeWindowMock = vi.fn();
const kpiUpsertMock = vi.fn();
const kpiFindManyMock = vi.fn();
const kpiFindFirstMock = vi.fn();
const ticketCountMock = vi.fn();

vi.mock("@/server/services/tickets-operational-dashboard", () => ({
  getTicketsOperationalDashboard: dashboardMock,
  computeWindow: computeWindowMock
}));

vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    ticket: { count: ticketCountMock },
    kpiSnapshot: {
      upsert: kpiUpsertMock,
      findMany: kpiFindManyMock,
      findFirst: kpiFindFirstMock
    }
  }
}));

// Resposta sintética do dashboard operacional usada como base dos cenários
function dashboardFixture(kpis: Record<string, unknown> = {}) {
  return {
    data: {
      window: { from: "2026-05-01T00:00:00.000Z", to: "2026-05-01T23:59:59.999Z" },
      generatedAt: "2026-05-01T12:00:00.000Z",
      kpis: {
        openTotal: 12,
        openDeltaPct: 3,
        inProgressByStatus: { DOING: 4, PAUSED: 1 },
        overdue: 2,
        avgResolutionHours: 6.5,
        firstContactResolutionRate: 0.8,
        ...kpis
      },
      charts: {
        statusDonut: [
          { status: "DONE", count: 5 },
          { status: "DOING", count: 4 }
        ],
        topClients: [],
        volume: [{ x: "2026-05-01T09:00:00.000Z", y: 3 }],
        categoryTrend: [],
        heatmap: []
      },
      tables: {
        criticalTickets: [],
        topAgents: [],
        topCategories: [{ category: "Rede", count: 7 }]
      }
    }
  };
}

describe("kpi-snapshots service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMock.mockResolvedValue(dashboardFixture());
    ticketCountMock.mockResolvedValue(0);
    kpiFindManyMock.mockResolvedValue([]);
    kpiFindFirstMock.mockResolvedValue(null);
    kpiUpsertMock.mockImplementation(async (args: any) => ({ id: "s1", ...args.create }));
  });

  it("captura o snapshot diário consolidando KPIs, concluídos e SLA em alerta", async () => {
    ticketCountMock.mockResolvedValueOnce(3);

    const { captureDailySnapshot } = await import("./kpi-snapshots");
    const snapshot = await captureDailySnapshot(new Date("2026-05-01T15:30:00.000Z"));

    expect(kpiUpsertMock).toHaveBeenCalledTimes(1);
    const args = kpiUpsertMock.mock.calls[0][0];
    expect(args.where.snapshotDate.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(args.create.openTotal).toBe(12);
    expect(args.create.doneTotal).toBe(5);
    expect(args.create.overdueTotal).toBe(2);
    expect(args.create.slaWarningTotal).toBe(3);
    expect(args.create.avgResolutionHours).toBe(6.5);
    expect(snapshot.id).toBe("s1");
  });

  it("lista snapshots no intervalo respeitando o limite máximo", async () => {
    kpiFindManyMock.mockResolvedValueOnce([
      {
        snapshotDate: new Date("2026-05-01T00:00:00.000Z"),
        openTotal: 12,
        doneTotal: 5,
        overdueTotal: 2,
        slaWarningTotal: 3,
        avgResolutionHours: 6.5,
        firstContactResolutionRate: 0.8
      }
    ]);

    const { listKpiSnapshots } = await import("./kpi-snapshots");
    const trend = await listKpiSnapshots({ from: new Date("2026-05-01"), to: new Date("2026-05-31"), limit: 999 });

    expect(kpiFindManyMock.mock.calls[0][0].take).toBe(365);
    expect(trend).toHaveLength(1);
    expect(trend[0].date).toBe("2026-05-01T00:00:00.000Z");
    expect(trend[0].openTotal).toBe(12);
  });

  it("gera o relatório gerencial com variações e tendência persistida", async () => {
    computeWindowMock.mockReturnValueOnce({
      from: new Date("2026-05-01T00:00:00.000Z"),
      to: new Date("2026-05-07T00:00:00.000Z"),
      prevFrom: new Date("2026-04-24T00:00:00.000Z"),
      prevTo: new Date("2026-05-01T00:00:00.000Z")
    });
    dashboardMock
      .mockResolvedValueOnce(
        dashboardFixture({ openTotal: 20, overdue: 4, avgResolutionHours: 5, firstContactResolutionRate: 0.9 })
      )
      .mockResolvedValueOnce(
        dashboardFixture({ openTotal: 10, overdue: 2, avgResolutionHours: 8, firstContactResolutionRate: 0.5 })
      );
    kpiFindFirstMock.mockResolvedValueOnce({ snapshotDate: new Date("2026-05-05T00:00:00.000Z") });

    const { getManagementReport } = await import("./kpi-snapshots");
    const report = await getManagementReport({ preset: "7d" });

    expect(report.data.kpis.openTotal).toBe(20);
    expect(report.data.previousKpis.openTotal).toBe(10);
    expect(report.data.deltas.openTotal.absolute).toBe(10);
    expect(report.data.deltas.openTotal.percent).toBe(100);
    expect(report.data.deltas.avgResolutionHours.absolute).toBe(-3);
    expect(report.data.latestSnapshotAt).toBe("2026-05-05T00:00:00.000Z");
  });
});
