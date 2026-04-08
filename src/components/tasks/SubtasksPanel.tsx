"use client";

import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
};

const Title = styled.div`
  font-weight: 800;
  margin-bottom: 0.75rem;
`;

const Row = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.85rem;
`;

export function SubtasksPanel(props: {
  subtasks: Subtask[];
  loading: boolean;
  onCreate: (title: string) => Promise<void>;
  onToggle: (subtaskId: string, isDone: boolean) => Promise<void>;
  onRemove: (subtaskId: string) => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => {
    const total = props.subtasks.length;
    const done = props.subtasks.filter((s) => s.isDone).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [props.subtasks]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      await props.onCreate(newTitle.trim());
      setNewTitle("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ padding: "1rem" }}>
      <Title>
        Subtarefas ({progress.done}/{progress.total}) · {progress.pct}%
      </Title>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Adicionar subtarefa" />
        <Button type="button" variant="primary" onClick={create} disabled={submitting || props.loading}>
          {submitting ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>

      {props.subtasks.length ? (
        <div>
          {props.subtasks.map((s) => (
            <Row key={s.id}>
              <input
                type="checkbox"
                checked={s.isDone}
                onChange={(e) => props.onToggle(s.id, e.target.checked)}
                aria-label={`Marcar subtarefa ${s.title}`}
              />
              <div style={{ flex: 1, textDecoration: s.isDone ? "line-through" : "none", opacity: s.isDone ? 0.7 : 1 }}>
                {s.title}
              </div>
              <Button type="button" variant="ghost" onClick={() => props.onRemove(s.id)}>
                Remover
              </Button>
            </Row>
          ))}
        </div>
      ) : (
        <Muted>Nenhuma subtarefa ainda.</Muted>
      )}
    </Card>
  );
}

