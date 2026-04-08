"use client";

import React, { useMemo } from "react";
import styled, { useTheme } from "styled-components";
import { Card } from "@/components/ui/Card";

const Wrap = styled(Card)`
  padding: 1rem;
  height: 320px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  overflow: hidden;
`;

const Title = styled.div`
  font-weight: 950;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 48px repeat(24, minmax(0, 1fr));
  gap: 4px;
  align-items: center;
  min-height: 0;
`;

const RowLabel = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: right;
  padding-right: 6px;
`;

const Cell = styled.div<{ $bg: string }>`
  height: 10px;
  border-radius: 4px;
  background: ${({ $bg }) => $bg};
`;

const HeaderCell = styled.div`
  height: 14px;
  font-size: 0.62rem;
  color: ${({ theme }) => theme.colors.text.muted};
  display: grid;
  place-items: center;
`;

const Days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function TicketsHeatmap({ data }: { data: Array<{ dow: number; hour: number; count: number }> }) {
  const theme = useTheme() as any;
  const { matrix, max } = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }).map(() => Array.from({ length: 24 }).map(() => 0));
    let max = 0;
    for (const c of data) {
      const d = clamp(Number(c.dow), 0, 6);
      const h = clamp(Number(c.hour), 0, 23);
      const n = clamp(Number(c.count), 0, 999999);
      m[d][h] = n;
      if (n > max) max = n;
    }
    return { matrix: m, max };
  }, [data]);

  const colorFor = (count: number) => {
    if (!max) return `${theme.colors.border}55`;
    const t = Math.pow(count / max, 0.72);
    const a = 0.08 + t * 0.62;
    return `rgba(59, 130, 246, ${a.toFixed(3)})`;
  };

  return (
    <Wrap aria-label="Heatmap de horários">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Title>Heatmap de horários</Title>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Aberturas por hora</div>
      </div>

      <div style={{ overflow: "hidden", minHeight: 0 }}>
        <Grid role="grid" aria-label="Heatmap">
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <HeaderCell key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</HeaderCell>
          ))}
          {matrix.map((row, d) => (
            <React.Fragment key={d}>
              <RowLabel>{Days[d]}</RowLabel>
              {row.map((count, h) => (
                <Cell
                  key={`${d}-${h}`}
                  $bg={colorFor(count)}
                  title={`${Days[d]} ${String(h).padStart(2, "0")}:00 · ${count}`}
                  role="gridcell"
                  aria-label={`${Days[d]} ${h}:00 ${count}`}
                />
              ))}
            </React.Fragment>
          ))}
        </Grid>
      </div>
    </Wrap>
  );
}

