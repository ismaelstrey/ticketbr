"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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

export function TopClientsBar({ data }: { data: Array<{ clientName: string; count: number }> }) {
  const theme = useTheme() as any;
  const series = data.map((d) => ({ name: d.clientName, count: d.count }));

  return (
    <Wrap aria-label="Top 10 clientes">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Title>Top 10 clientes</Title>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Mais aberturas</div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.colors.border} strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: theme.colors.text.muted, fontSize: 11 }} interval={0} angle={-18} height={55} />
          <YAxis tick={{ fill: theme.colors.text.muted, fontSize: 11 }} />
          <Tooltip contentStyle={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12 }} />
          <Bar dataKey="count" fill={theme.colors.primary} radius={[10, 10, 0, 0]} animationDuration={300} />
        </BarChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

