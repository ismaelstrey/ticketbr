"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function VolumeLine({ data }: { data: Array<{ x: string; y: number }> }) {
  const theme = useTheme() as any;
  const series = data.map((p) => ({ x: p.x, y: p.y }));

  return (
    <Wrap aria-label="Volume de tickets ao longo do tempo">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Title>Volume no tempo</Title>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Aberturas</div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.colors.border} strokeDasharray="4 4" />
          <XAxis dataKey="x" tick={{ fill: theme.colors.text.muted, fontSize: 11 }} tickFormatter={fmt} minTickGap={18} />
          <YAxis tick={{ fill: theme.colors.text.muted, fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12 }}
            labelFormatter={(label) => fmt(String(label ?? ""))}
          />
          <Line type="monotone" dataKey="y" stroke={theme.colors.status.info} strokeWidth={2.4} dot={false} animationDuration={300} />
        </LineChart>
      </ResponsiveContainer>
    </Wrap>
  );
}
