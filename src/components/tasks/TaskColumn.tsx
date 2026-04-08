"use client";

import React from "react";
import styled from "styled-components";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Card } from "@/components/ui/Card";

const ColumnContainer = styled.div<{ $isDragOver: boolean }>`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  overflow: hidden;
  min-height: 240px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  ${({ $isDragOver, theme }) =>
    $isDragOver
      ? `
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 4px ${theme.colors.primary}18;
    `
      : ""}
`;

const Header = styled.div<{ $color: string }>`
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ $color }) => $color};
  color: white;

  h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
  }

  span {
    font-size: 0.85rem;
    font-weight: 800;
    opacity: 0.95;
  }
`;

const CardsList = styled.div`
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Empty = styled(Card)`
  padding: 0.9rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

export function TaskColumn(props: {
  status: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
  dragOverColumn: TaskStatus | null;
  draggingTaskId: string | null;
  dropTargetTaskId: string | null;
  onOpenTask: (taskId: string) => void;
  onColumnDragOver: (e: React.DragEvent, status: TaskStatus) => void;
  onColumnDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onColumnDragLeave: () => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string) => void;
  onTaskDragEnd: () => void;
  onCardDragOver: (e: React.DragEvent, taskId: string) => void;
  onCardDrop: (e: React.DragEvent, taskId: string) => void;
}) {
  return (
    <ColumnContainer
      $isDragOver={props.dragOverColumn === props.status}
      onDragOver={(e) => props.onColumnDragOver(e, props.status)}
      onDragLeave={props.onColumnDragLeave}
      onDrop={(e) => props.onColumnDrop(e, props.status)}
      role="region"
      aria-label={`Coluna ${props.title}`}
    >
      <Header $color={props.color}>
        <h2>{props.title}</h2>
        <span>{props.tasks.length}</span>
      </Header>

      <CardsList>
        {props.tasks.length ? (
          props.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={props.draggingTaskId === task.id}
              isDropTarget={props.dropTargetTaskId === task.id}
              onOpen={props.onOpenTask}
              onDragStart={props.onTaskDragStart}
              onDragEnd={props.onTaskDragEnd}
              onDragOverCard={props.onCardDragOver}
              onDropOnCard={props.onCardDrop}
            />
          ))
        ) : (
          <Empty>Sem tarefas.</Empty>
        )}
      </CardsList>
    </ColumnContainer>
  );
}

