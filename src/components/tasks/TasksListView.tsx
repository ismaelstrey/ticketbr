"use client";

import React, { useMemo } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Task } from "@/types/task";
import { taskPriorityLabels, taskStatusLabels, getDueState } from "@/components/tasks/task-constants";
import { formatDateTimePtBR } from "@/components/tasks/task-format";

const Table = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 160px 170px 160px 160px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
`;

const Th = styled.div`
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
`;

export function TasksListView(props: { tasks: Task[]; onOpenTask: (id: string) => void }) {
  const list = useMemo(() => props.tasks.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [props.tasks]);

  return (
    <Card style={{ padding: "1rem" }}>
      <Table role="table" aria-label="Lista de tarefas">
        <Th>#</Th>
        <Th>Título</Th>
        <Th>Status</Th>
        <Th>Responsável</Th>
        <Th>Vencimento</Th>
        <Th>Prioridade</Th>
        {list.map((t, idx) => (
          <React.Fragment key={t.id}>
            <Td>{idx + 1}</Td>
            <Td>
              <button
                type="button"
                onClick={() => props.onOpenTask(t.id)}
                style={{ background: "transparent", border: "none", color: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
              >
                {t.title}
              </button>
            </Td>
            <Td>{taskStatusLabels[t.status]}</Td>
            <Td>{t.assignee?.name || "-"}</Td>
            <Td style={{ color: getDueState(t.dueAt, t.status) === "overdue" ? "#F87171" : undefined }}>{formatDateTimePtBR(t.dueAt)}</Td>
            <Td>{taskPriorityLabels[t.priority]}</Td>
          </React.Fragment>
        ))}
      </Table>
    </Card>
  );
}

