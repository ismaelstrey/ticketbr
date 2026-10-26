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

// Conformidade de SLA e valor por contrato (F3 — operação)
export type ContractComplianceItem = {
  contratoId: string;
  numero: string;
  titulo: string;
  cliente: string | null;
  status: string;
  valorMensal: number | null;
  slaSolucaoHoras: number | null;
  vigencia: { inicio: string; fim: string | null };
  ticketsTotal: number;
  ticketsForaDeContrato: number;
  ticketsResolvidos: number;
  ticketsDentroSla: number;
  cumprimentoPct: number | null;
};

export type ContractComplianceSummary = {
  contratosAtivos: number;
  contratosVencendo30d: number;
  contratosCancelados: number;
  valorMensalTotal: number;
  ticketsForaDeContrato: number;
  cumprimentoMedioPct: number | null;
};

export type ContractComplianceReport = {
  summary: ContractComplianceSummary;
  items: ContractComplianceItem[];
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
    contracts: ContractComplianceReport;
    latestSnapshotAt: string | null;
  };
};
