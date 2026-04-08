"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const Title = styled.div`
  font-weight: 950;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const Th = styled.th`
  text-align: left;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 10px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 10px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  vertical-align: top;
`;

const TrButton = styled.button`
  width: 100%;
  border: none;
  padding: 0;
  text-align: left;
  background: transparent;
  cursor: pointer;
  display: block;

  &:hover {
    opacity: 0.92;
  }
`;

const Pill = styled.span<{ $tone: "danger" | "warning" | "info" | "neutral" }>`
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1px solid ${({ theme, $tone }) => ($tone === "danger" ? `${theme.colors.status.warning}55` : $tone === "warning" ? `${theme.colors.status.warning}55` : $tone === "info" ? `${theme.colors.status.info}55` : theme.colors.border)};
  background: ${({ theme, $tone }) => ($tone === "danger" ? `${theme.colors.status.warning}10` : $tone === "warning" ? `${theme.colors.status.warning}10` : $tone === "info" ? `${theme.colors.status.info}10` : theme.colors.surfaceAlt)};
  color: ${({ theme, $tone }) => ($tone === "danger" ? theme.colors.status.warning : $tone === "warning" ? theme.colors.status.warning : $tone === "info" ? theme.colors.status.info : theme.colors.text.secondary)};
`;

function toneForTicket(priority: string, status: string, solutionSlaAt: string | null) {
  const now = Date.now();
  const sla = solutionSlaAt ? new Date(solutionSlaAt).getTime() : null;
  if (sla != null && sla < now) return "danger";
  if (priority === "HIGH") return "warning";
  if (status === "DOING") return "info";
  return "neutral";
}

function fmtDate(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function DashboardTables({
  criticalTickets,
  topAgents,
  topCategories,
  onOpenTicket
}: {
  criticalTickets: Array<any>;
  topAgents: Array<any>;
  topCategories: Array<any>;
  onOpenTicket: (id: string) => void;
}) {
  return (
    <Grid aria-label="Tabelas operacionais">
      <Card style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <Title>Tickets críticos</Title>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{criticalTickets.length} item(ns)</div>
        </div>

        {criticalTickets.length ? (
          <div style={{ overflow: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>Cliente</Th>
                  <Th>Status</Th>
                  <Th>SLA</Th>
                </tr>
              </thead>
              <tbody>
                {criticalTickets.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <TrButton onClick={() => onOpenTicket(t.id)} aria-label={`Abrir ticket ${t.number}`}>
                        <div style={{ fontWeight: 900, marginBottom: 4 }}>#{t.number}</div>
                        <div style={{ opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 520 }}>{t.subject}</div>
                      </TrButton>
                    </Td>
                    <Td>{t.clientName}</Td>
                    <Td>
                      <Pill $tone={toneForTicket(t.priority, t.status, t.solutionSlaAt)}>{t.priority} · {t.status}</Pill>
                    </Td>
                    <Td>{fmtDate(t.solutionSlaAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div style={{ opacity: 0.7 }}>Sem tickets críticos para os filtros.</div>
        )}
      </Card>

      <div style={{ display: "grid", gap: 12 }}>
        <Card style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <Title>Agentes (melhor desempenho)</Title>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Concluídos</div>
          </div>
          {topAgents.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Agente</Th>
                  <Th>Concluídos</Th>
                  <Th>TMR (h)</Th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((a) => (
                  <tr key={a.agentId}>
                    <Td style={{ fontWeight: 800 }}>{a.agentName}</Td>
                    <Td>{a.resolved}</Td>
                    <Td>{a.avgResolutionHours ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div style={{ opacity: 0.7 }}>Sem dados no período.</div>
          )}
        </Card>

        <Card style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <Title>Categorias recorrentes</Title>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Top 10</div>
          </div>
          {topCategories.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {topCategories.map((c) => (
                <div key={c.category} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.category}</div>
                  <div style={{ fontWeight: 900 }}>{c.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.7 }}>Sem dados no período.</div>
          )}

          <div style={{ marginTop: 12 }}>
            <Button type="button" variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Voltar ao topo
            </Button>
          </div>
        </Card>
      </div>
    </Grid>
  );
}
