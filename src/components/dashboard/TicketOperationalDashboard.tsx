"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DashboardFilters, DashboardFilterOptions } from "@/components/dashboard/DashboardFilters";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { StatusDonut } from "@/components/dashboard/charts/StatusDonut";
import { TopClientsBar } from "@/components/dashboard/charts/TopClientsBar";
import { VolumeLine } from "@/components/dashboard/charts/VolumeLine";
import { CategoryStackedArea } from "@/components/dashboard/charts/CategoryStackedArea";
import { TicketsHeatmap } from "@/components/dashboard/charts/TicketsHeatmap";
import { DashboardTables } from "@/components/dashboard/Tables";
import { api } from "@/services/api";
import { TicketDashboardFilters, TicketOperationalDashboardResponse } from "@/types/ticketsDashboard";

const Page = styled.div`
  padding: 1rem;
  display: grid;
  gap: 12px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Sub = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.92rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 360px;
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const ChartsRow2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

function defaultFilters(): TicketDashboardFilters {
  return { preset: "7d" };
}

function normalizeOptions(list: any[], toName: (x: any) => string) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ id: String(x.id), name: toName(x) }))
    .filter((x) => x.id && x.name)
    .slice(0, 200);
}

export function TicketOperationalDashboard() {
  const [filtersDraft, setFiltersDraft] = useState<TicketDashboardFilters>(() => defaultFilters());
  const [filtersApplied, setFiltersApplied] = useState<TicketDashboardFilters>(() => defaultFilters());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TicketOperationalDashboardResponse | null>(null);
  const lastUpdatedRef = useRef<string>("");

  const [options, setOptions] = useState<DashboardFilterOptions>({ clients: [], categories: [], agents: [] });

  const lastUpdated = data?.data.generatedAt || lastUpdatedRef.current;

  const cacheKey = useMemo(() => {
    const f = filtersApplied;
    return `ticketsDash:v1:${[f.preset, f.from, f.to, f.status, f.priority, f.agentId, f.clientId, f.categoryId, f.q].map((v) => v || "-").join("|")}`;
  }, [filtersApplied]);

  const loadOptions = useCallback(async () => {
    try {
      const [users, solicitantesRes, categorias] = await Promise.all([
        api.users.list().catch(() => []),
        fetch("/api/solicitantes?page=1&pageSize=100&sortBy=nome_fantasia&sortDir=asc").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/categorias-ticket").then((r) => r.json()).catch(() => [])
      ]);

      setOptions({
        agents: normalizeOptions(users, (u) => String(u.name || u.email || u.id)),
        clients: normalizeOptions(solicitantesRes?.data || [], (s) => String(s.nome_fantasia || s.razao_social || s.id)),
        categories: normalizeOptions(categorias, (c) => String(c.nome || c.id))
      });
    } catch {
      setOptions({ clients: [], categories: [], agents: [] });
    }
  }, []);

  const fetchDashboard = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      if (!isRefresh) {
        const cached = (() => {
          try {
            return sessionStorage.getItem(cacheKey);
          } catch {
            return null;
          }
        })();

        if (cached && !data) {
          const parsed = (() => {
            try {
              return JSON.parse(cached);
            } catch {
              return null;
            }
          })();
          if (parsed) {
            setData(parsed);
            lastUpdatedRef.current = parsed?.data?.generatedAt || lastUpdatedRef.current;
          }
        }
        setLoading(true);
      }
      setError(null);
      try {
        const res = await api.dashboard.ticketsOperational(filtersApplied);
        setData(res);
        lastUpdatedRef.current = res.data.generatedAt;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res));
        } catch {
          void 0;
        }
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar dashboard");
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [filtersApplied, cacheKey, data]
  );

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      fetchDashboard(true);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchDashboard]);

  const apply = () => {
    setFiltersApplied(filtersDraft);
  };

  const reset = () => {
    const next = defaultFilters();
    setFiltersDraft(next);
    setFiltersApplied(next);
  };

  const quickFilter = (patch: Record<string, string | undefined>) => {
    const next = { ...filtersDraft, ...patch };
    setFiltersDraft(next);
    setFiltersApplied(next);
  };

  const download = async (format: "xlsx" | "pdf") => {
    const res = await api.dashboard.exportTicketsOperational({ ...filtersApplied, format });
    if (!res.ok) {
      const json = await res.json().catch(() => null as any);
      throw new Error((json && json.error) || "Falha ao exportar");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "pdf" ? "dashboard_tickets.pdf" : "dashboard_tickets.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const windowLabel = useMemo(() => {
    const w = data?.data.window;
    if (!w) return "";
    const from = new Date(w.from);
    const to = new Date(w.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
    return `${from.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })} → ${to.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  }, [data]);

  const onOpenTicket = (id: string) => {
    window.location.href = `/ticket/kanban/${id}`;
  };

  return (
    <Page>
      <HeaderRow>
        <div>
          <Title>Dashboard operacional</Title>
          <Sub>
            {windowLabel ? `Janela: ${windowLabel} · ` : ""}
            {lastUpdated ? `Atualizado: ${new Date(lastUpdated).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            {refreshing ? " · atualizando..." : ""}
          </Sub>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button type="button" variant={autoRefresh ? "primary" : "ghost"} onClick={() => setAutoRefresh((v) => !v)}>
            {autoRefresh ? "Auto-refresh: 30s" : "Auto-refresh: off"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => fetchDashboard(true)} disabled={refreshing}>
            Atualizar agora
          </Button>
          <Button type="button" variant="ghost" onClick={() => download("xlsx").catch((e) => setError(e.message))}>
            Exportar Excel
          </Button>
          <Button type="button" variant="ghost" onClick={() => download("pdf").catch((e) => setError(e.message))}>
            Exportar PDF
          </Button>
        </div>
      </HeaderRow>

      <DashboardFilters value={filtersDraft} options={options} onChange={setFiltersDraft} onApply={apply} onReset={reset} applying={loading || refreshing} />

      {error ? (
        <Card style={{ padding: "1rem" }} role="alert">
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Erro ao carregar</div>
          <div style={{ opacity: 0.78 }}>{error}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" variant="ghost" onClick={() => fetchDashboard(false)}>
              Tentar novamente
            </Button>
            <Button type="button" variant="ghost" onClick={() => setError(null)}>
              Fechar
            </Button>
          </div>
        </Card>
      ) : null}

      {loading && !data ? (
        <Card style={{ padding: "1rem" }}>
          <div style={{ opacity: 0.75 }}>Carregando dashboard...</div>
        </Card>
      ) : data ? (
        <>
          <KpiCards kpis={data.data.kpis} onQuickFilter={quickFilter} />

          <ChartsGrid>
            <VolumeLine data={data.data.charts.volume} />
            <TopClientsBar data={data.data.charts.topClients} />
            <StatusDonut data={data.data.charts.statusDonut} />
          </ChartsGrid>

          <ChartsRow2>
            <CategoryStackedArea data={data.data.charts.categoryTrend} />
            <TicketsHeatmap data={data.data.charts.heatmap} />
          </ChartsRow2>

          <DashboardTables
            criticalTickets={data.data.tables.criticalTickets}
            topAgents={data.data.tables.topAgents}
            topCategories={data.data.tables.topCategories}
            onOpenTicket={onOpenTicket}
          />
        </>
      ) : null}
    </Page>
  );
}
