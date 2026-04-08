"use client";

import React from "react";
import styled from "styled-components";
import { Task } from "@/types/task";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FiAlertCircle, FiClock, FiPaperclip } from "@/components/icons";
import { getDueState, taskPriorityLabels, taskStatusLabels } from "@/components/tasks/task-constants";

const CardButton = styled(Card)<{ $isDragging?: boolean; $isDropTarget?: boolean }>`
  padding: 0.85rem;
  cursor: grab;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceElevated};
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;

  ${({ $isDragging }) =>
    $isDragging
      ? `
    opacity: 0.65;
    transform: rotate(-0.2deg);
  `
      : ""}

  ${({ $isDropTarget, theme }) =>
    $isDropTarget
      ? `
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 4px ${theme.colors.primary}18;
  `
      : ""}
`;

const Title = styled.div`
  font-weight: 800;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.25;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.55rem;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.82rem;
`;

const Mini = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const TicketPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.22);
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.78rem;
  font-weight: 700;
`;

function formatDue(dueAt: string) {
  try {
    return new Date(dueAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dueAt;
  }
}

export function TaskCard(props: {
  task: Task;
  isDragging: boolean;
  isDropTarget: boolean;
  onOpen: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDragOverCard: (e: React.DragEvent, taskId: string) => void;
  onDropOnCard: (e: React.DragEvent, taskId: string) => void;
}) {
  const dueState = getDueState(props.task.dueAt, props.task.status);
  const dueLabel = props.task.dueAt ? formatDue(props.task.dueAt) : "";
  const hasAttachments = false;

  return (
    <CardButton
      as="button"
      type="button"
      draggable
      $isDragging={props.isDragging}
      $isDropTarget={props.isDropTarget}
      onClick={() => props.onOpen(props.task.id)}
      onDragStart={(e) => props.onDragStart(e, props.task.id)}
      onDragEnd={props.onDragEnd}
      onDragOver={(e) => props.onDragOverCard(e, props.task.id)}
      onDrop={(e) => props.onDropOnCard(e, props.task.id)}
      aria-label={`Abrir tarefa ${props.task.title}`}
      style={{ textAlign: "left", width: "100%" }}
    >
      <Title>{props.task.title}</Title>

      <MetaRow>
        <Badge>{taskStatusLabels[props.task.status]}</Badge>
        <Badge>{taskPriorityLabels[props.task.priority]}</Badge>
        {props.task.assignee?.name ? <Mini>👤 {props.task.assignee.name}</Mini> : null}
      </MetaRow>

      <MetaRow>
        {props.task.dueAt ? (
          <Mini style={{ color: dueState === "overdue" ? "#F87171" : dueState === "soon" ? "#FBBF24" : undefined }}>
            {dueState === "overdue" ? <FiAlertCircle /> : <FiClock />}
            {dueLabel}
          </Mini>
        ) : (
          <Mini>Sem vencimento</Mini>
        )}

        {props.task.ticketLinks?.length ? (
          <TicketPill>{props.task.ticketLinks.length} ticket(s)</TicketPill>
        ) : null}

        {hasAttachments ? (
          <Mini>
            <FiPaperclip />
            Anexos
          </Mini>
        ) : null}
      </MetaRow>
    </CardButton>
  );
}
