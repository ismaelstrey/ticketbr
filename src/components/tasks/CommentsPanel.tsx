"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { formatDateTimePtBR } from "@/components/tasks/task-format";
import { TaskComment } from "@/types/task";

const Title = styled.div`
  font-weight: 800;
  margin-bottom: 0.75rem;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Body = styled.div`
  font-size: 0.9rem;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.85rem;
`;

export function CommentsPanel(props: {
  comments: TaskComment[];
  loading: boolean;
  onCreate: (body: string) => Promise<void>;
  onRemove: (commentId: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const value = body.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      await props.onCreate(value);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ padding: "1rem" }}>
      <Title>Comentários ({props.comments.length})</Title>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva um comentário"
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting || props.loading}>
            {submitting ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </div>

      {props.comments.length ? (
        <div>
          {props.comments.map((comment) => {
            // Só o autor ou um administrador podem remover o comentário
            const canRemove = user?.role === "ADMIN" || comment.authorId === user?.id;
            return (
              <Row key={comment.id}>
                <Meta>
                  <strong>{comment.author?.name || "Usuário"}</strong>
                  <span>{formatDateTimePtBR(comment.createdAt)}</span>
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => props.onRemove(comment.id)}
                      style={{ marginLeft: "auto" }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </Meta>
                <Body>{comment.body}</Body>
              </Row>
            );
          })}
        </div>
      ) : (
        <Muted>Nenhum comentário ainda.</Muted>
      )}
    </Card>
  );
}
