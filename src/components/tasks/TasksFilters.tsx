"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { TaskPriority, TaskStatus } from "@/types/task";
import { taskPriorityLabels, taskStatusLabels } from "@/components/tasks/task-constants";

const FiltersGrid = styled(Card)`
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

export function TasksFilters(props: {
  query: string;
  setQuery: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  assigneeId: string;
  setAssigneeId: (v: string) => void;
  assignees: Array<{ id: string; name: string }>;
  ticketId: string;
  setTicketId: (v: string) => void;
  overdueOnly: boolean;
  setOverdueOnly: (v: boolean) => void;
  dueFrom: string;
  setDueFrom: (v: string) => void;
  dueTo: string;
  setDueTo: (v: string) => void;
  loading: boolean;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <FiltersGrid>
      <Input value={props.query} onChange={(e) => props.setQuery(e.target.value)} placeholder="Buscar por título ou descrição" />
      <Select value={props.status} onChange={(e) => props.setStatus(e.target.value)}>
        <option value="">Status: Todos</option>
        {(Object.keys(taskStatusLabels) as TaskStatus[]).map((key) => (
          <option key={key} value={key}>
            {taskStatusLabels[key]}
          </option>
        ))}
      </Select>
      <Select value={props.priority} onChange={(e) => props.setPriority(e.target.value)}>
        <option value="">Prioridade: Todas</option>
        {(Object.keys(taskPriorityLabels) as TaskPriority[]).map((key) => (
          <option key={key} value={key}>
            {taskPriorityLabels[key]}
          </option>
        ))}
      </Select>
      <Select value={props.assigneeId} onChange={(e) => props.setAssigneeId(e.target.value)}>
        <option value="">Responsável: Todos</option>
        {props.assignees.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
      <Input value={props.ticketId} onChange={(e) => props.setTicketId(e.target.value)} placeholder="Ticket vinculado (ID)" />
      <Select value={props.overdueOnly ? "true" : "false"} onChange={(e) => props.setOverdueOnly(e.target.value === "true")}>
        <option value="false">Vencimento: Todos</option>
        <option value="true">Somente vencidas</option>
      </Select>

      <Input type="date" value={props.dueFrom} onChange={(e) => props.setDueFrom(e.target.value)} />
      <Input type="date" value={props.dueTo} onChange={(e) => props.setDueTo(e.target.value)} />

      <div style={{ display: "flex", gap: 8, gridColumn: "span 2", justifyContent: "flex-end" }}>
        <Button type="button" variant="ghost" onClick={props.onClear} disabled={props.loading}>
          Limpar
        </Button>
        <Button type="button" variant="primary" onClick={props.onApply} disabled={props.loading}>
          {props.loading ? "Carregando..." : "Aplicar"}
        </Button>
      </div>
    </FiltersGrid>
  );
}

