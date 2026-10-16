import { Prisma, prisma } from "@/lib/prisma";
import { computeWindow, getTicketsOperationalDashboard } from "@/server/services/tickets-operational-dashboard";
import type {
  KpiDelta,
  KpiTrendPoint,
  ManagementReportFilters,
  ManagementReportResponse
} from "@/types/managementReport";

const DEFAULT_TREND_LIMIT = 90;
const MAX_TREND_LIMIT = 365;
const SLA_WARNING_HOURS_DEFAULT = 4;

// Normaliza uma data para o início do dia (UTC) - base da chave única do snapshot
function startOfUtcDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

// Normaliza uma data para o fim do dia (UTC) - limite superior da janela de captura
function endOfUtcDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
}

// Janela (em horas) usada para considerar um SLA "próximo do vencimento"
function resolveSlaWarningHours(): number {
  const raw = Number(process.env.SLA_WARNING_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : SLA_WARNING_HOURS_DEFAULT;
}

// Conta tickets abertos cujo SLA de solução vence dentro da janela de aviso
async function countSlaWarnings(now: Date): Promise<number> {
  const limit = new Date(now.getTime() + resolveSlaWarningHours() * 60 * 60 * 1000);
  return prisma.ticket.count({
    where: {
      deleted_at: null,
      status: { not: "DONE" as any },
      solutionSlaAt: { gte: now, lte: limit }
    }
  });
}

/**
 * Captura (ou atualiza) o snapshot diário de KPIs de uma data.
 * Idempotente: reexecuções no mesmo dia sobrescrevem o registro via upsert.
 */
export async function captureDailySnapshot(referenceDate: Date = new Date()) {
  const dayStart = startOfUtcDay(referenceDate);
  const dayEnd = endOfUtcDay(referenceDate);
  const now = new Date();

  const [dashboard, slaWarningTotal] = await Promise.all([
    getTicketsOperationalDashboard({
      preset: "custom",
      from: dayStart.toISOString(),
      to: dayEnd.toISOString()
    }),
    countSlaWarnings(now)
  ]);

  const kpis = dashboard.data.kpis;
  const doneTotal = dashboard.data.charts.statusDonut.find((slice) => slice.status === "DONE")?.count ?? 0;

  const payload = {
    openTotal: kpis.openTotal,
    doneTotal,
    overdueTotal: kpis.overdue,
    slaWarningTotal,
    avgResolutionHours: kpis.avgResolutionHours,
    firstContactResolutionRate: kpis.firstContactResolutionRate,
    details: {
      inProgressByStatus: kpis.inProgressByStatus,
      statusDonut: dashboard.data.charts.statusDonut,
      topCategories: dashboard.data.tables.topCategories
    } as Prisma.InputJsonValue
  };

  return prisma.kpiSnapshot.upsert({
    where: { snapshotDate: dayStart },
    create: { snapshotDate: dayStart, ...payload },
    update: payload
  });
}

/**
 * Lista os snapshots persistidos no intervalo informado (série de tendência).
 */
export async function listKpiSnapshots(options: { from: Date; to: Date; limit?: number }): Promise<KpiTrendPoint[]> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_TREND_LIMIT, 1), MAX_TREND_LIMIT);

  const rows = await prisma.kpiSnapshot.findMany({
    where: { snapshotDate: { gte: options.from, lte: options.to } },
    orderBy: { snapshotDate: "asc" },
    take: limit
  });

  return rows.map((row) => ({
    date: startOfUtcDay(row.snapshotDate).toISOString(),
    openTotal: row.openTotal,
    doneTotal: row.doneTotal,
    overdueTotal: row.overdueTotal,
    slaWarningTotal: row.slaWarningTotal,
    avgResolutionHours: row.avgResolutionHours,
    firstContactResolutionRate: row.firstContactResolutionRate
  }));
}

// Calcula a variação absoluta e percentual entre dois valores (null quando indisponível)
function computeDelta(current: number | null, previous: number | null): KpiDelta {
  if (current == null || previous == null) return { absolute: null, percent: null };
  const absolute = current - previous;
  const percent = previous === 0 ? null : Number(((absolute / previous) * 100).toFixed(1));
  return { absolute: Number(absolute.toFixed(2)), percent };
}

/**
 * Relatório gerencial: KPIs do período atual, comparação com o período anterior
 * e série de tendência a partir dos snapshots persistidos.
 */
export async function getManagementReport(filters: ManagementReportFilters): Promise<ManagementReportResponse> {
  const window = computeWindow(filters);

  const [current, previous, trend, latest] = await Promise.all([
    getTicketsOperationalDashboard({
      preset: "custom",
      from: window.from.toISOString(),
      to: window.to.toISOString()
    }),
    getTicketsOperationalDashboard({
      preset: "custom",
      from: window.prevFrom.toISOString(),
      to: window.prevTo.toISOString()
    }),
    listKpiSnapshots({ from: window.from, to: window.to }),
    prisma.kpiSnapshot.findFirst({ orderBy: { snapshotDate: "desc" } })
  ]);

  const kpis = current.data.kpis;
  const previousKpis = previous.data.kpis;

  return {
    data: {
      window: {
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        prevFrom: window.prevFrom.toISOString(),
        prevTo: window.prevTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      kpis,
      previousKpis,
      deltas: {
        openTotal: computeDelta(kpis.openTotal, previousKpis.openTotal),
        overdue: computeDelta(kpis.overdue, previousKpis.overdue),
        avgResolutionHours: computeDelta(kpis.avgResolutionHours, previousKpis.avgResolutionHours),
        firstContactResolutionRate: computeDelta(
          kpis.firstContactResolutionRate,
          previousKpis.firstContactResolutionRate
        )
      },
      charts: {
        statusDonut: current.data.charts.statusDonut,
        volume: current.data.charts.volume,
        topCategories: current.data.tables.topCategories
      },
      trend,
      latestSnapshotAt: latest ? startOfUtcDay(latest.snapshotDate).toISOString() : null
    }
  };
}
