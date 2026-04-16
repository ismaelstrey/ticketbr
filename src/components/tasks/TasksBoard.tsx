"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { Task, TaskStatus } from "@/types/task";
import { taskColumns, getDueState } from "@/components/tasks/task-constants";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TasksFilters } from "@/components/tasks/TasksFilters";
import { TasksListView } from "@/components/tasks/TasksListView";
import { TasksAlertsModal } from "@/components/tasks/TasksAlertsModal";
import { HeaderRow, KanbanGrid, StatusHint, Title, Toolbar } from "@/components/tasks/TasksBoardLayout";

export default function TasksBoard() {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [savingMove, setSavingMove] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { PENDING: [], IN_PROGRESS: [], DONE: [] };
    for (const t of tasks) map[t.status].push(t);
    (Object.keys(map) as TaskStatus[]).forEach((k) => map[k].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    return map;
  }, [tasks]);

  const dueSoon = useMemo(() => tasks.filter((t) => getDueState(t.dueAt, t.status) === "soon"), [tasks]);
  const overdue = useMemo(() => tasks.filter((t) => getDueState(t.dueAt, t.status) === "overdue"), [tasks]);
  const notificationsCount = dueSoon.length + overdue.length;

  const loadBase = async () => {
    const [tasksRes, assigneesRes] = await Promise.all([api.tasks.list(), api.tasks.assignees()]);
    setTasks((tasksRes.data || []) as any);
    setAssignees((assigneesRes.data || []).map((u) => ({ id: u.id, name: u.name })));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBase();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyFilters = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query.trim()) params.q = query.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (assigneeId) params.assigneeId = assigneeId;
      if (ticketId.trim()) params.ticketId = ticketId.trim();
      if (dueFrom) params.dueFrom = new Date(dueFrom).toISOString();
      if (dueTo) params.dueTo = new Date(dueTo).toISOString();
      if (overdueOnly) params.overdue = "true";
      const res = await api.tasks.list(params);
      setTasks((res.data || []) as any);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setQuery("");
    setStatus("");
    setPriority("");
    setAssigneeId("");
    setDueFrom("");
    setDueTo("");
    setOverdueOnly(false);
    setTicketId("");
    setLoading(true);
    try {
      await loadBase();
    } finally {
      setLoading(false);
    }
  };

  const openTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const openNewTask = () => {
    setIsModalOpen(true);
  };

  const submitTask = async (payload: any) => {
    setModalSubmitting(true);
    try {
      await api.tasks.create(payload);
      await applyFilters();
    } finally {
      setModalSubmitting(false);
    }
  };

  const moveTask = async (taskId: string, destStatus: TaskStatus, beforeId?: string | null) => {
    setSavingMove(true);
    try {
      const res = await api.tasks.move(taskId, { status: destStatus, beforeId: beforeId ?? null });
      const updated = res.data as Task;
      setTasks((current) => {
        const next = current.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
        return next.slice().sort((a, b) => {
          if (a.status !== b.status) return a.status.localeCompare(b.status);
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
      });
    } finally {
      setSavingMove(false);
    }
  };

  const onTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    setDropTargetTaskId(null);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
    setDropTargetTaskId(null);
  };

  const onColumnDragOver = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(col);
  };

  const onColumnDrop = async (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingTaskId;
    if (!id) return;
    await moveTask(id, col, null);
    setDragOverColumn(null);
    setDropTargetTaskId(null);
  };

  const onCardDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggingTaskId && draggingTaskId !== taskId) {
      setDropTargetTaskId(taskId);
    }
  };

  const onCardDrop = async (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    const movingId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    if (!movingId || movingId === taskId) return;
    const beforeTask = tasks.find((t) => t.id === taskId);
    if (!beforeTask) return;
    await moveTask(movingId, beforeTask.status, beforeTask.id);
    setDropTargetTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <HeaderRow>
          <Title>Tarefas</Title>
          <Toolbar>
            <Button type="button" variant="ghost" onClick={() => setView((v) => (v === "kanban" ? "list" : "kanban"))}>
              {view === "kanban" ? "Lista" : "Kanban"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setNotificationsOpen(true)}>
              Alertas {notificationsCount ? `(${notificationsCount})` : ""}
            </Button>
            <Button type="button" variant="primary" onClick={openNewTask}>
              Nova tarefa
            </Button>
          </Toolbar>
        </HeaderRow>

        <TasksFilters
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          priority={priority}
          setPriority={setPriority}
          assigneeId={assigneeId}
          setAssigneeId={setAssigneeId}
          assignees={assignees}
          ticketId={ticketId}
          setTicketId={setTicketId}
          overdueOnly={overdueOnly}
          setOverdueOnly={setOverdueOnly}
          dueFrom={dueFrom}
          setDueFrom={setDueFrom}
          dueTo={dueTo}
          setDueTo={setDueTo}
          loading={loading}
          onClear={clearFilters}
          onApply={applyFilters}
        />

        {savingMove ? <StatusHint role="status">Salvando mudança...</StatusHint> : null}

        {view === "kanban" ? (
          <KanbanGrid>
            {taskColumns.map((col) => (
              <TaskColumn
                key={col.key}
                status={col.key}
                title={col.title}
                color={col.color}
                tasks={tasksByStatus[col.key]}
                dragOverColumn={dragOverColumn}
                draggingTaskId={draggingTaskId}
                dropTargetTaskId={dropTargetTaskId}
                onOpenTask={openTask}
                onColumnDragOver={onColumnDragOver}
                onColumnDrop={onColumnDrop}
                onColumnDragLeave={() => setDragOverColumn(null)}
                onTaskDragStart={onTaskDragStart}
                onTaskDragEnd={onTaskDragEnd}
                onCardDragOver={onCardDragOver}
                onCardDrop={onCardDrop}
              />
            ))}
          </KanbanGrid>
        ) : (
          <TasksListView tasks={tasks} onOpenTask={openTask} />
        )}

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initial={null}
          assignees={assignees}
          onSubmit={submitTask}
          submitting={modalSubmitting}
        />

        <TasksAlertsModal
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          dueSoon={dueSoon}
          overdue={overdue}
          onOpenTask={openTask}
        />
      </MainContent>
    </AppShellContainer>
  );
}
