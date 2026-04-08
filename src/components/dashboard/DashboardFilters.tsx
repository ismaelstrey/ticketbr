"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { TicketDashboardFilters, TicketDashboardPreset } from "@/types/ticketsDashboard";

const Wrap = styled(Card)`
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
`;

const Grid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(12, minmax(0, 1fr));

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div<{ $span?: number }>`
  grid-column: span ${({ $span }) => $span ?? 3};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-column: span ${({ $span }) => Math.min($span ?? 3, 6)};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-column: span 1;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

export type DashboardFilterOptions = {
  clients: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string }>;
};

export function DashboardFilters({
  value,
  options,
  onChange,
  onApply,
  onReset,
  applying
}: {
  value: TicketDashboardFilters;
  options: DashboardFilterOptions;
  onChange: (next: TicketDashboardFilters) => void;
  onApply: () => void;
  onReset: () => void;
  applying?: boolean;
}) {
  const preset = (value.preset ?? "7d") as TicketDashboardPreset;

  return (
    <Wrap aria-label="Filtros do dashboard">
      <Grid>
        <Field $span={2}>
          <Label htmlFor="dash-preset">Período</Label>
          <Select
            id="dash-preset"
            value={preset}
            onChange={(e) => {
              const next = e.target.value as TicketDashboardPreset;
              onChange({ ...value, preset: next, ...(next !== "custom" ? { from: undefined, to: undefined } : {}) });
            }}
          >
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="custom">Personalizado</option>
          </Select>
        </Field>

        <Field $span={2}>
          <Label htmlFor="dash-from">De</Label>
          <Input
            id="dash-from"
            type="datetime-local"
            disabled={preset !== "custom"}
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value, preset: "custom" })}
          />
        </Field>

        <Field $span={2}>
          <Label htmlFor="dash-to">Até</Label>
          <Input
            id="dash-to"
            type="datetime-local"
            disabled={preset !== "custom"}
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value, preset: "custom" })}
          />
        </Field>

        <Field $span={2}>
          <Label htmlFor="dash-status">Status</Label>
          <Select id="dash-status" value={value.status ?? ""} onChange={(e) => onChange({ ...value, status: e.target.value || undefined })}>
            <option value="">Todos</option>
            <option value="TODO">Aberto</option>
            <option value="DOING">Em andamento</option>
            <option value="PAUSED">Pausado</option>
            <option value="DONE">Concluído</option>
          </Select>
        </Field>

        <Field $span={2}>
          <Label htmlFor="dash-priority">Prioridade</Label>
          <Select id="dash-priority" value={value.priority ?? ""} onChange={(e) => onChange({ ...value, priority: e.target.value || undefined })}>
            <option value="">Todas</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="NONE">Sem</option>
          </Select>
        </Field>

        <Field $span={2}>
          <Label htmlFor="dash-agent">Agente</Label>
          <Select id="dash-agent" value={value.agentId ?? ""} onChange={(e) => onChange({ ...value, agentId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {options.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field $span={3}>
          <Label htmlFor="dash-client">Cliente</Label>
          <Select id="dash-client" value={value.clientId ?? ""} onChange={(e) => onChange({ ...value, clientId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field $span={3}>
          <Label htmlFor="dash-category">Categoria</Label>
          <Select id="dash-category" value={value.categoryId ?? ""} onChange={(e) => onChange({ ...value, categoryId: e.target.value || undefined })}>
            <option value="">Todas</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field $span={6}>
          <Label htmlFor="dash-q">Busca</Label>
          <Input id="dash-q" value={value.q ?? ""} onChange={(e) => onChange({ ...value, q: e.target.value || undefined })} placeholder="Assunto ou descrição" />
        </Field>
      </Grid>

      <Actions>
        <Button type="button" variant="ghost" onClick={onReset} disabled={applying}>
          Limpar
        </Button>
        <Button type="button" variant="primary" onClick={onApply} disabled={applying}>
          {applying ? "Aplicando..." : "Aplicar"}
        </Button>
      </Actions>
    </Wrap>
  );
}

