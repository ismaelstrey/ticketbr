"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import styled, { useTheme } from "styled-components";
import { Card } from "@/components/ui/Card";

const Wrap = styled(Card)`
  padding: 1rem;
  height: 320px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
`;

const Title = styled.div`
  font-weight: 950;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 140px);
  gap: 10px;
  min-height: 0;
`;

const ChartCell = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Legend = styled.div`
  display: grid;
  gap: 6px;
  align-content: start;
  overflow-y: auto;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  display: inline-block;
  margin-right: 8px;
  flex-shrink: 0;
`;

function labelForStatus(status: string) {
  if (status === "TODO") return "Aberto";
  if (status === "DOING") return "Em andamento";
  if (status === "PAUSED") return "Pausado";
  if (status === "DONE") return "Concluído";
  return status;
}

export function StatusDonut({ data }: { data: Array<{ status: string; count: number }> }) {
  const theme = useTheme() as any;
  const colors = useMemo(
    () => [theme.colors.primary, theme.colors.status.info, theme.colors.status.warning, theme.colors.status.success, theme.colors.status.purple],
    [theme]
  );

  const total = data.reduce((a, b) => a + b.count, 0);
  const series = data.map((d, idx) => ({ ...d, name: labelForStatus(d.status), color: colors[idx % colors.length] }));

  return (
    <Wrap aria-label="Distribuição por status">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Title>Distribuição por status</Title>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{total} ticket(s)</div>
      </div>

      <Body>
        <ChartCell>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={series}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  animationDuration={300}
                >
                  {series.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty>Sem dados no período</Empty>
          )}
        </ChartCell>

        <Legend aria-label="Legenda por status">
          {series.map((s) => (
            <LegendRow key={s.status}>
              <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                <Swatch $color={s.color} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              <div style={{ fontWeight: 900, color: theme.colors.text.primary }}>{s.count}</div>
            </LegendRow>
          ))}
        </Legend>
      </Body>
    </Wrap>
  );
}
