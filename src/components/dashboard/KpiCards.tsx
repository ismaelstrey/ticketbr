"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Item = styled(Card)<{ $critical?: boolean }>`
  padding: 1rem;
  border: 1px solid ${({ theme, $critical }) => ($critical ? `${theme.colors.status.warning}55` : theme.colors.border)};
  background: ${({ theme, $critical }) => ($critical ? `${theme.colors.status.warning}10` : theme.colors.surface)};
  cursor: pointer;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const Value = styled.div`
  font-size: 1.6rem;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Label = styled.div`
  margin-top: 6px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Delta = styled.div<{ $positive?: boolean }>`
  margin-top: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme, $positive }) => ($positive ? theme.colors.status.success : theme.colors.status.warning)};
`;

export function KpiCards({
  kpis,
  onQuickFilter
}: {
  kpis: {
    openTotal: number;
    openDeltaPct: number | null;
    overdue: number;
    avgResolutionHours: number | null;
    firstContactResolutionRate: number | null;
    inProgressByStatus: Record<string, number>;
  };
  onQuickFilter: (patch: Record<string, string | undefined>) => void;
}) {
  const inProgress = (kpis.inProgressByStatus.DOING ?? 0) + (kpis.inProgressByStatus.PAUSED ?? 0);
  const openDeltaLabel = kpis.openDeltaPct == null ? "" : `${kpis.openDeltaPct >= 0 ? "+" : ""}${kpis.openDeltaPct.toFixed(1)}% vs período anterior`;
  const fcr = kpis.firstContactResolutionRate == null ? "—" : `${Math.round(kpis.firstContactResolutionRate * 100)}%`;

  return (
    <Grid aria-label="Métricas principais">
      <Item onClick={() => onQuickFilter({ status: undefined })}>
        <Value>{kpis.openTotal}</Value>
        <Label>Tickets abertos</Label>
        {openDeltaLabel ? <Delta $positive={kpis.openDeltaPct != null && kpis.openDeltaPct <= 0}>{openDeltaLabel}</Delta> : null}
      </Item>

      <Item onClick={() => onQuickFilter({ status: "DOING" })}>
        <Value>{inProgress}</Value>
        <Label>Em andamento</Label>
        <Delta $positive={true}>{`DOING: ${kpis.inProgressByStatus.DOING ?? 0} · PAUSED: ${kpis.inProgressByStatus.PAUSED ?? 0}`}</Delta>
      </Item>

      <Item $critical={true} onClick={() => onQuickFilter({ status: undefined })}>
        <Value>{kpis.overdue}</Value>
        <Label>Estourando prazo</Label>
        <Delta $positive={false}>Atenção imediata</Delta>
      </Item>

      <Item onClick={() => onQuickFilter({ status: "DONE" })}>
        <Value>{kpis.avgResolutionHours == null ? "—" : kpis.avgResolutionHours.toFixed(2)}</Value>
        <Label>Tempo médio de resolução (h)</Label>
        <Delta $positive={true}>Base: tickets concluídos</Delta>
      </Item>

      <Item onClick={() => onQuickFilter({ status: "DONE" })}>
        <Value>{fcr}</Value>
        <Label>Taxa de 1º contato</Label>
        <Delta $positive={true}>Resoluções com até 1 comentário</Delta>
      </Item>
    </Grid>
  );
}
