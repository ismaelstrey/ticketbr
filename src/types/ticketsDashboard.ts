export type TicketDashboardPreset = "today" | "7d" | "30d" | "custom";

export type TicketDashboardFilters = {
  preset?: TicketDashboardPreset;
  from?: string;
  to?: string;
  status?: string;
  priority?: string;
  agentId?: string;
  clientId?: string;
  categoryId?: string;
  q?: string;
};

export type TicketDashboardKpis = {
  openTotal: number;
  openDeltaPct: number | null;
  inProgressByStatus: Record<string, number>;
  overdue: number;
  avgResolutionHours: number | null;
  firstContactResolutionRate: number | null;
};

export type TicketDashboardChartPoint = { x: string; y: number };

export type TicketStatusDonutSlice = { status: string; count: number };
export type TicketTopClientBar = { clientId: string | null; clientName: string; count: number };

export type TicketCategoryTrendPoint = {
  x: string;
  category: string;
  count: number;
};

export type TicketHeatmapCell = { dow: number; hour: number; count: number };

export type TicketCriticalItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  clientName: string;
  assigneeName: string;
  responseSlaAt: string | null;
  solutionSlaAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketTopAgent = { agentId: string; agentName: string; resolved: number; avgResolutionHours: number | null };
export type TicketTopCategory = { category: string; count: number };

export type TicketOperationalDashboardResponse = {
  data: {
    window: { from: string; to: string };
    generatedAt: string;
    kpis: TicketDashboardKpis;
    charts: {
      statusDonut: TicketStatusDonutSlice[];
      topClients: TicketTopClientBar[];
      volume: TicketDashboardChartPoint[];
      categoryTrend: TicketCategoryTrendPoint[];
      heatmap: TicketHeatmapCell[];
    };
    tables: {
      criticalTickets: TicketCriticalItem[];
      topAgents: TicketTopAgent[];
      topCategories: TicketTopCategory[];
    };
  };
};

