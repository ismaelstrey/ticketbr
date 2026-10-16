import type {
  TicketDashboardChartPoint,
  TicketDashboardKpis,
  TicketStatusDonutSlice,
  TicketTopCategory
} from "@/types/ticketsDashboard";

export type ManagementReportPreset = "today" | "7d" | "30d" | "custom";

export type ManagementReportFilters = {
  preset?: ManagementReportPreset;
  from?: string;
  to?: string;
};

// Variação de um KPI em relação ao período anterior
export type KpiDelta = {
  absolute: number | null;
  percent: number | null;
};

// Ponto de tendência derivado de um snapshot diário persistido
export type KpiTrendPoint = {
  date: string;
  openTotal: number;
  doneTotal: number;
  overdueTotal: number;
  slaWarningTotal: number;
  avgResolutionHours: number | null;
  firstContactResolutionRate: number | null;
};

export type ManagementReportResponse = {
  data: {
    window: { from: string; to: string; prevFrom: string; prevTo: string };
    generatedAt: string;
    kpis: TicketDashboardKpis;
    previousKpis: TicketDashboardKpis;
    deltas: {
      openTotal: KpiDelta;
      overdue: KpiDelta;
      avgResolutionHours: KpiDelta;
      firstContactResolutionRate: KpiDelta;
    };
    charts: {
      statusDonut: TicketStatusDonutSlice[];
      volume: TicketDashboardChartPoint[];
      topCategories: TicketTopCategory[];
    };
    trend: KpiTrendPoint[];
    latestSnapshotAt: string | null;
  };
};
