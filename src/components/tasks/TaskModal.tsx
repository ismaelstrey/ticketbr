"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Task, TaskPriority, TaskStatus } from "@/types/task";
import { taskPriorityLabels, taskStatusLabels } from "@/components/tasks/task-constants";

const Grid = styled.div`
  display: grid;
  gap: 0.85rem;
`;

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.div`
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 0.35rem;
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.warning};
  font-size: 0.85rem;
`;

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function TaskModal(props: {
  isOpen: boolean;
  onClose: () => void;
  initial?: Task | null;
  assignees: Array<{ id: string; name: string }>;
  onSubmit: (payload: {
    title: string;
    description: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    dueAt: string | null;
    assigneeId: string | null;
    ticketIds: string[];
  }) => Promise<void>;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("PENDING");
  const [dueAt, setDueAt] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [ticketIds, setTicketIds] = useState<string>("");
  const [error, setError] = useState<string>("");

  const isEdit = Boolean(props.initial?.id);
  const modalTitle = useMemo(() => (isEdit ? "Editar tarefa" : "Nova tarefa"), [isEdit]);

  useEffect(() => {
    if (!props.isOpen) return;
    setError("");
    setTitle(props.initial?.title || "");
    setDescription(props.initial?.description || "");
    setPriority(props.initial?.priority || "MEDIUM");
    setStatus(props.initial?.status || "PENDING");
    setDueAt(toDatetimeLocal(props.initial?.dueAt || null));
    setAssigneeId(props.initial?.assigneeId || "");
    setTicketIds((props.initial?.ticketLinks || []).map((l) => l.ticketId).join(","));
  }, [props.isOpen, props.initial]);

  const submit = async () => {
    setError("");
    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }

    const tickets = ticketIds
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      await props.onSubmit({
        title: title.trim(),
        description: description.trim() ? description : null,
        priority,
        status,
        dueAt: fromDatetimeLocal(dueAt),
        assigneeId: assigneeId || null,
        ticketIds: tickets
      });
      props.onClose();
    } catch (e: any) {
      setError(String(e?.message || "Falha ao salvar tarefa."));
    }
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={modalTitle}>
      <Grid>
        {error ? <ErrorText role="alert">{error}</ErrorText> : null}

        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar ticket do cliente" />
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa" />
        </div>

        <TwoCols>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {(Object.keys(taskStatusLabels) as TaskStatus[]).map((key) => (
                <option key={key} value={key}>
                  {taskStatusLabels[key]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {(Object.keys(taskPriorityLabels) as TaskPriority[]).map((key) => (
                <option key={key} value={key}>
                  {taskPriorityLabels[key]}
                </option>
              ))}
            </Select>
          </div>
        </TwoCols>

        <TwoCols>
          <div>
            <Label>Vencimento</Label>
            <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Não atribuído</option>
              {props.assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </TwoCols>

        <div>
          <Label>Tickets vinculados (IDs separados por vírgula)</Label>
          <Input value={ticketIds} onChange={(e) => setTicketIds(e.target.value)} placeholder="Ex.: ckx..., ckz..." />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={props.onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={props.submitting}>
            {props.submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Grid>
    </Modal>
  );
}

