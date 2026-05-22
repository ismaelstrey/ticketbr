export type CustomerDashboardPreset = "today" | "7d" | "30d" | "custom";

export type CustomerDashboardFilters = {
  preset?: CustomerDashboardPreset;
  from?: string;
  to?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  q?: string;
};

export type CustomerSlaState = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "DONE" | "NO_SLA";

export type CustomerSlaSummary = {
  state: CustomerSlaState;
  label: string;
  progress: number | null;
  responseSlaAt: string | null;
  solutionSlaAt: string | null;
};

export type CustomerDashboardResponse = {
  data: {
    window: { from: string; to: string };
    generatedAt: string;
    kpis: {
      openTotal: number;
      inProgress: number;
      doneInRange: number;
      overdue: number;
      atRisk: number;
      avgResolutionHours: number | null;
      avgFirstResponseHours: number | null;
    };
    charts: {
      volume: Array<{ x: string; y: number }>;
      statusDonut: Array<{ status: string; label: string; count: number }>;
      categoryBar: Array<{ category: string; count: number }>;
      slaDonut: Array<{ state: CustomerSlaState; label: string; count: number }>;
    };
    tables: {
      criticalTickets: Array<{
        id: string;
        number: number;
        subject: string;
        status: string;
        priority: string;
        category: string;
        sla: CustomerSlaSummary;
        updatedAt: string;
      }>;
    };
  };
};
