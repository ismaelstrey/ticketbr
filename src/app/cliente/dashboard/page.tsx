"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styled, { useTheme } from "styled-components";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { CustomerDashboardResponse } from "@/types/customerDashboard";
import { formatDurationHours } from "@/lib/customerPortal";

const PageGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-start;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 1.35rem;
  font-weight: 800;
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Filters = styled.div`
  display: grid;
  grid-template-columns: 180px 180px 180px minmax(220px, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[2]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const KpiGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const KpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const KpiValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChartGrid = styled.section`
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(Card)`
  min-height: 320px;
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  grid-template-rows: auto 1fr;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ChartTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CriticalCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 780px;
  display: grid;
  grid-template-columns: 90px 1fr 150px 140px 170px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  overflow: hidden;
`;

const Th = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: 800;
`;

const Td = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`;

const RowLink = styled(Link)`
  display: contents;
  color: inherit;
  text-decoration: none;

  &:hover ${Td} {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const Subject = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
`;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function priorityLabel(priority: string) {
  if (priority === "HIGH") return "Alta";
  if (priority === "MEDIUM") return "Media";
  return "Normal";
}

function slaTone(state: string): "neutral" | "success" | "warning" | "info" {
  if (state === "OVERDUE") return "warning";
  if (state === "AT_RISK") return "info";
  if (state === "DONE" || state === "ON_TRACK") return "success";
  return "neutral";
}

export default function CustomerTicketDashboardPage() {
  const theme = useTheme();
  const [data, setData] = useState<CustomerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("7d");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [q, setQ] = useState("");

  const colors = useMemo(
    () => [theme.colors.primary, theme.colors.status.success, theme.colors.status.info, theme.colors.status.purple, theme.colors.status.warning],
    [theme]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (preset) params.set("preset", preset);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/customer/dashboard/tickets?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar dashboard");
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, [preset, priority, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.data.kpis;

  return (
    <PageGrid>
      <HeaderRow>
        <div>
          <Title>Dashboard</Title>
          <Subtitle>Indicadores de atendimento e SLA das solicitacoes da sua empresa.</Subtitle>
        </div>
        <Button type="button" variant="ghost" onClick={() => load()} disabled={loading}>
          Atualizar
        </Button>
      </HeaderRow>

      <Filters>
        <Select value={preset} onChange={(event) => setPreset(event.target.value)}>
          <option value="today">Hoje</option>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="TODO">Aberto</option>
          <option value="DOING">Em atendimento</option>
          <option value="PAUSED">Pausado</option>
          <option value="DONE">Concluido</option>
        </Select>
        <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">Todas prioridades</option>
          <option value="NONE">Normal</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </Select>
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar solicitacao" />
        <Button type="button" variant="ghost" onClick={() => { setStatus(""); setPriority(""); setQ(""); setPreset("7d"); }}>
          Limpar
        </Button>
      </Filters>

      {loading && !data ? (
        <LoadingState title="Carregando dashboard" description="Buscando indicadores de atendimento." />
      ) : error ? (
        <EmptyState title="Dashboard indisponivel" description={error} />
      ) : data && kpis ? (
        <>
          <KpiGrid>
            <KpiCard>
              <KpiLabel>Abertos</KpiLabel>
              <KpiValue>{kpis.openTotal}</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Em atendimento</KpiLabel>
              <KpiValue>{kpis.inProgress}</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Concluidos no periodo</KpiLabel>
              <KpiValue>{kpis.doneInRange}</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>SLA vencido</KpiLabel>
              <KpiValue>{kpis.overdue}</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Tempo medio resolucao</KpiLabel>
              <KpiValue>{formatDurationHours(kpis.avgResolutionHours)}</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Primeira resposta</KpiLabel>
              <KpiValue>{formatDurationHours(kpis.avgFirstResponseHours)}</KpiValue>
            </KpiCard>
          </KpiGrid>

          <ChartGrid>
            <ChartCard>
              <ChartTitle>Volume de tickets</ChartTitle>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.data.charts.volume}>
                  <CartesianGrid stroke={theme.colors.border} />
                  <XAxis dataKey="x" tickFormatter={formatDate} stroke={theme.colors.text.secondary} />
                  <YAxis allowDecimals={false} stroke={theme.colors.text.secondary} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label || ""))} />
                  <Line type="monotone" dataKey="y" stroke={theme.colors.primary} strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>Status</ChartTitle>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.data.charts.statusDonut} dataKey="count" nameKey="label" innerRadius={58} outerRadius={92}>
                    {data.data.charts.statusDonut.map((entry, index) => (
                      <Cell key={entry.status} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>Tickets por categoria</ChartTitle>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.data.charts.categoryBar}>
                  <CartesianGrid stroke={theme.colors.border} />
                  <XAxis dataKey="category" stroke={theme.colors.text.secondary} />
                  <YAxis allowDecimals={false} stroke={theme.colors.text.secondary} />
                  <Tooltip />
                  <Bar dataKey="count" fill={theme.colors.status.info} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>SLA</ChartTitle>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.data.charts.slaDonut} dataKey="count" nameKey="label" outerRadius={96}>
                    {data.data.charts.slaDonut.map((entry, index) => (
                      <Cell key={entry.state} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartGrid>

          <CriticalCard>
            <ChartTitle>Tickets que precisam de atencao</ChartTitle>
            {data.data.tables.criticalTickets.length ? (
              <TableWrap>
                <Table>
                  <Th>#</Th>
                  <Th>Assunto</Th>
                  <Th>Prioridade</Th>
                  <Th>SLA</Th>
                  <Th>Atualizado</Th>
                  {data.data.tables.criticalTickets.map((ticket) => (
                    <RowLink key={ticket.id} href={`/cliente/tickets/${ticket.id}`}>
                      <Td>{ticket.number}</Td>
                      <Td><Subject>{ticket.subject}</Subject></Td>
                      <Td><Badge>{priorityLabel(ticket.priority)}</Badge></Td>
                      <Td><Badge tone={slaTone(ticket.sla.state)}>{ticket.sla.label}</Badge></Td>
                      <Td>{formatDate(ticket.updatedAt)}</Td>
                    </RowLink>
                  ))}
                </Table>
              </TableWrap>
            ) : (
              <EmptyState title="Nenhum ticket critico" description="Nao ha chamados vencidos, em risco ou de alta prioridade neste filtro." />
            )}
          </CriticalCard>
        </>
      ) : null}
    </PageGrid>
  );
}
