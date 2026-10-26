"use client";

import React from "react";
import styled from "styled-components";
import { getSlaToneColor, getSlaToneFromProgress, type SlaChipTone } from "@/lib/tickets/sla-chip";

export type SlaCountdownProps = {
  /** Prazo final do SLA (ISO string ou Date). */
  deadline?: string | Date | null;
  /** Data de abertura, usada apenas para calcular o tom (progresso). */
  start?: string | Date | null;
  /** Congela o contador (ex.: ticket pausado com pauseSla). */
  paused?: boolean;
  /** Instante em que a pausa atual começou. */
  pausedSince?: string | Date | null;
  /** Milissegundos já acumulados em pausas anteriores. */
  pausedTotalMs?: number;
  /** Ticket finalizado: congela e exibe o rótulo de conclusão. */
  done?: boolean;
  /** Texto exibido quando o ticket está finalizado. */
  doneLabel?: string;
};

const Value = styled.span<{ $tone: SlaChipTone }>`
  color: ${({ $tone }) => getSlaToneColor($tone)};
  font-variant-numeric: tabular-nums;
  font-weight: 700;
`;

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formata milissegundos como "2d 03h 15m 09s" (sinal negativo preservado). */
export function formatRemainingDuration(ms: number): string {
  const negative = ms < 0;
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);

  return `${negative ? "-" : ""}${parts.join(" ")}`;
}

/**
 * Contador decrescente do SLA em tempo real.
 * Espelha a regra do backend: pausas (com pauseSla) devolvem tempo ao prazo.
 */
export function SlaCountdown({
  deadline,
  start,
  paused = false,
  pausedSince = null,
  pausedTotalMs = 0,
  done = false,
  doneLabel = "Concluído"
}: SlaCountdownProps) {
  // Inicia nulo para evitar divergência entre SSR e hidratação
  const [now, setNow] = React.useState<number | null>(null);

  const deadlineDate = toDate(deadline);
  const ticking = Boolean(deadlineDate) && !done && !paused;

  React.useEffect(() => {
    setNow(Date.now());
  }, []);

  React.useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  if (!deadlineDate || now === null) return <Value $tone="safe">-</Value>;
  if (done) return <Value $tone="safe">{doneLabel}</Value>;

  // Enquanto pausado, o relógio congela no início da pausa atual.
  const reference = paused ? (toDate(pausedSince)?.getTime() ?? now) : now;
  const remaining = deadlineDate.getTime() - reference + Math.max(pausedTotalMs, 0);

  const startDate = toDate(start);
  const total = startDate ? deadlineDate.getTime() - startDate.getTime() : 0;
  const rawProgress = total > 0 ? ((total - remaining) / total) * 100 : remaining <= 0 ? 100 : 0;
  const tone = getSlaToneFromProgress(Math.min(Math.max(rawProgress, 0), 100));

  const label =
    remaining < 0
      ? `Atrasado há ${formatRemainingDuration(remaining).slice(1)}`
      : `${formatRemainingDuration(remaining)} restantes`;

  return (
    <Value $tone={tone} role="timer">
      {label}
    </Value>
  );
}

export default SlaCountdown;
