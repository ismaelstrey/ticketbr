"use client";

import React, { useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { useManagementReport } from "@/hooks/useManagementReport";
import { VolumeLine } from "@/components/dashboard/charts/VolumeLine";
import { FiAlertCircle, FiCheckCircle, FiClock, FiDownload, FiTrendingUp } from "@/components/icons";

type Preset = "today" | "7d" | "30d";

const PRESET_LABELS: Record<Preset, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias"
};

// ============================================================
// Estilos
// ============================================================
const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Title = styled.h1`
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.md};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const PresetButton = styled.button<{ $active: boolean }>`
  padding: 0.45rem 0.9rem;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.status.info : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.status.info}22` : "transparent")};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.status.info};
  }
`;

const ExportButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  text-decoration: none;
  transition: all 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.status.info};
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const KpiValue = styled.div`
  font-size: 1.7rem;
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const KpiLabel = styled.div`
  margin-top: 6px;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Delta = styled.div<{ $tone: "good" | "bad" | "neutral" }>`
  margin-top: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme, $tone }) =>
    $tone === "good" ? theme.colors.status.success : $tone === "bad" ? theme.colors.status.warning : theme.colors.text.muted};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(Card)`
  padding: 1rem;
  height: 340px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
`;

const CardTitle = styled.div`
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const Th = styled.th`
  text-align: left;
  padding: 0.6rem 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 0.6rem 0.75rem;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Hint = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

// Formata um número inteiro em pt-BR
function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Formata a variação percentual em relação ao período anterior
function formatDeltaPercent(percent: number | null): string {
  if (percent == null) return "sem base de comparação";
  const signal = percent > 0 ? "+" : "";
  return `${signal}${percent.toFixed(1)}% vs período anterior`;
}

// Define o tom (cor) da variação conforme a métrica (menor é melhor, exceto FCR)
function deltaTone(percent: number | null, lowerIsBetter: boolean): "good" | "bad" | "neutral" {
  if (percent == null || percent === 0) return "neutral";
  const isGood = lowerIsBetter ? percent < 0 : percent > 0;
  return isGood ? "good" : "bad";
}

export default function ManagementReportsPage() {
  const theme = useTheme() as any;
  const [preset, setPreset] = useState<Preset>("7d");
  const { data, loading, error } = useManagementReport({ preset });

  const trendSeries = useMemo(
    () =>
      (data?.trend ?? []).map((point) => ({
        date: point.date.slice(0, 10),
        abertos: point.openTotal,
        concluidos: point.doneTotal,
        estourando: point.overdueTotal
      })),
    [data]
  );

  const exportUrl = (format: "xlsx" | "pdf") =>
    `/api/reports/management/export?format=${format}&preset=${preset}`;

  const kpis = data?.kpis;
  const deltas = data?.deltas;
  const fcr = kpis?.firstContactResolutionRate == null ? "—" : `${Math.round(kpis.firstContactResolutionRate * 100)}%`;

  return (
    <AppLayout>
      <Container>
        <Header>
          <HeaderText>
            <Title>
              <FiTrendingUp /> Relatório Gerencial
            </Title>
            <Subtitle>
              KPIs do período, comparação com o período anterior e tendência a partir dos snapshots diários persistidos.
            </Subtitle>
          </HeaderText>

          <Actions>
            {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
              <PresetButton key={key} $active={preset === key} onClick={() => setPreset(key)} type="button">
                {PRESET_LABELS[key]}
              </PresetButton>
            ))}
            <ExportButton href={exportUrl("xlsx")} target="_blank" rel="noopener noreferrer">
              <FiDownload /> XLSX
            </ExportButton>
            <ExportButton href={exportUrl("pdf")} target="_blank" rel="noopener noreferrer">
              <FiDownload /> PDF
            </ExportButton>
          </Actions>
        </Header>

        {error ? (
          <Card>
            <Hint>
              <FiAlertCircle /> {error}
            </Hint>
          </Card>
        ) : null}

        <KpiGrid aria-label="Indicadores gerenciais">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <KpiValue>{loading && !kpis ? "—" : formatNumber(kpis?.openTotal ?? 0)}</KpiValue>
              <KpiLabel>Tickets abertos</KpiLabel>
              <Delta $tone={deltaTone(deltas?.openTotal.percent ?? null, true)}>
                {formatDeltaPercent(deltas?.openTotal.percent ?? null)}
              </Delta>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <KpiValue>{loading && !kpis ? "—" : formatNumber(kpis?.overdue ?? 0)}</KpiValue>
              <KpiLabel>Estourando prazo</KpiLabel>
              <Delta $tone={deltaTone(deltas?.overdue.percent ?? null, true)}>
                {formatDeltaPercent(deltas?.overdue.percent ?? null)}
              </Delta>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <KpiValue>{kpis?.avgResolutionHours == null ? "—" : kpis.avgResolutionHours.toFixed(2)}</KpiValue>
              <KpiLabel>Tempo médio de resolução (h)</KpiLabel>
              <Delta $tone={deltaTone(deltas?.avgResolutionHours.percent ?? null, true)}>
                {formatDeltaPercent(deltas?.avgResolutionHours.percent ?? null)}
              </Delta>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <KpiValue>{fcr}</KpiValue>
              <KpiLabel>Taxa de 1º contato</KpiLabel>
              <Delta $tone={deltaTone(deltas?.firstContactResolutionRate.percent ?? null, false)}>
                {formatDeltaPercent(deltas?.firstContactResolutionRate.percent ?? null)}
              </Delta>
            </Card>
          </motion.div>
        </KpiGrid>

        <ChartsGrid>
          <ChartCard aria-label="Tendência de KPIs persistidos">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <CardTitle>Tendência (snapshots diários)</CardTitle>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {data?.latestSnapshotAt ? `Último snapshot: ${data.latestSnapshotAt.slice(0, 10)}` : "Sem snapshots"}
              </div>
            </div>
            {trendSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendSeries} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke={theme.colors.border} strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill: theme.colors.text.muted, fontSize: 11 }} minTickGap={18} />
                  <YAxis tick={{ fill: theme.colors.text.muted, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 12
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="abertos" stroke={theme.colors.status.info} strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="concluidos" stroke={theme.colors.status.success} strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="estourando" stroke={theme.colors.status.warning} strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Hint>
                <FiClock /> Nenhum snapshot persistido no período. A varredura diária (/api/cron/kpi-snapshot) alimenta esta série.
              </Hint>
            )}
          </ChartCard>

          <VolumeLine data={data?.charts.volume ?? []} />
        </ChartsGrid>

        <Card>
          <CardTitle style={{ marginBottom: 10 }}>Top categorias no período</CardTitle>
          {data?.charts.topCategories.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Categoria</Th>
                  <Th>Tickets</Th>
                </tr>
              </thead>
              <tbody>
                {data.charts.topCategories.map((row) => (
                  <tr key={row.category}>
                    <Td>{row.category}</Td>
                    <Td>{formatNumber(row.count)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Hint>
              <FiCheckCircle /> Sem dados de categoria para o período selecionado.
            </Hint>
          )}
        </Card>
      </Container>
    </AppLayout>
  );
}
