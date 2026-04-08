"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import styled, { useTheme } from "styled-components";
import { Card } from "@/components/ui/Card";

const Wrap = styled(Card)`
  padding: 1rem;
  height: 320px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
`;

const Title = styled.div`
  font-weight: 950;
`;

function fmt(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function CategoryStackedArea({ data }: { data: Array<{ x: string; category: string; count: number }> }) {
  const theme = useTheme() as any;

  const { rows, keys } = useMemo(() => {
    const byX: Record<string, Record<string, number>> = {};
    const set = new Set<string>();
    for (const p of data) {
      set.add(p.category);
      byX[p.x] = byX[p.x] || {};
      byX[p.x][p.category] = (byX[p.x][p.category] || 0) + p.count;
    }
    const keys = Array.from(set).sort((a, b) => a.localeCompare(b));
    const rows = Object.keys(byX)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((x) => ({ x, ...byX[x] }));
    return { rows, keys };
  }, [data]);

  const colors = [theme.colors.primary, theme.colors.status.info, theme.colors.status.warning, theme.colors.status.purple, theme.colors.status.success];

  return (
    <Wrap aria-label="Evolução por categoria">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Title>Evolução por categoria</Title>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Área empilhada</div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.colors.border} strokeDasharray="4 4" />
          <XAxis dataKey="x" tick={{ fill: theme.colors.text.muted, fontSize: 11 }} tickFormatter={fmt} minTickGap={18} />
          <YAxis tick={{ fill: theme.colors.text.muted, fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12 }}
            labelFormatter={(label) => fmt(String(label ?? ""))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.slice(0, 6).map((k, idx) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.18}
              animationDuration={300}
              dot={false}
              activeDot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Wrap>
  );
}
