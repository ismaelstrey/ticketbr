import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";

vi.mock("recharts", async () => {
  const Null = ({ children }: any) => <div data-recharts="stub">{children}</div>;
  return {
    ResponsiveContainer: ({ children }: any) => {
      const child = Array.isArray(children) ? children[0] : children;
      if (!React.isValidElement(child)) return <div />;
      return React.cloneElement(child as any, { width: 900, height: 260 });
    },
    PieChart: Null,
    Pie: Null,
    Cell: Null,
    Tooltip: Null,
    BarChart: Null,
    Bar: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    LineChart: Null,
    Line: Null,
    AreaChart: Null,
    Area: Null,
    Legend: Null
  };
});

vi.mock("@/services/api", () => ({
  api: {
    users: { list: vi.fn().mockResolvedValue([]) },
    dashboard: {
      ticketsOperational: vi.fn().mockResolvedValue({
        data: {
          window: { from: new Date().toISOString(), to: new Date().toISOString() },
          generatedAt: new Date().toISOString(),
          kpis: {
            openTotal: 12,
            openDeltaPct: 10,
            inProgressByStatus: { DOING: 3, PAUSED: 1 },
            overdue: 2,
            avgResolutionHours: 5.25,
            firstContactResolutionRate: 0.4
          },
          charts: {
            statusDonut: [{ status: "TODO", count: 5 }],
            topClients: [{ clientId: null, clientName: "Acme", count: 7 }],
            volume: [{ x: new Date().toISOString(), y: 3 }],
            categoryTrend: [{ x: new Date().toISOString(), category: "Rede", count: 2 }],
            heatmap: [{ dow: 1, hour: 9, count: 1 }]
          },
          tables: {
            criticalTickets: [
              {
                id: "t1",
                number: 100,
                subject: "Falha crítica",
                status: "DOING",
                priority: "HIGH",
                clientName: "Acme",
                assigneeName: "Agente",
                responseSlaAt: null,
                solutionSlaAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            topAgents: [{ agentId: "u1", agentName: "Agente", resolved: 10, avgResolutionHours: 3.2 }],
            topCategories: [{ category: "Rede", count: 9 }]
          }
        }
      }),
      exportTicketsOperational: vi.fn()
    }
  }
}));

describe("TicketOperationalDashboard", () => {
  it("renderiza KPIs e tabelas com dados", async () => {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 900 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 900 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 600 });

    (HTMLElement.prototype as any).getBoundingClientRect = () => ({
      width: 900,
      height: 600,
      top: 0,
      left: 0,
      right: 900,
      bottom: 600
    });

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] })
    });

    const { TicketOperationalDashboard } = await import("./TicketOperationalDashboard");
    render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <TicketOperationalDashboard />
      </ThemeProvider>
    );

    expect(screen.getByText("Dashboard operacional")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Tickets abertos")).toBeTruthy();
    });

    expect(screen.getByText("Tickets críticos")).toBeTruthy();
    expect(screen.getByText("Falha crítica")).toBeTruthy();
  }, 15_000);
});
