"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type TaskTicketLink = { id: string; ticketId: string };

const Title = styled.div`
  font-weight: 800;
  margin-bottom: 0.75rem;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.55rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.85rem;
`;

export function TicketLinksPanel(props: {
  links: TaskTicketLink[];
  onAdd: (ticketId: string) => Promise<void>;
  onRemove: (linkId: string) => Promise<void>;
}) {
  const [ticketId, setTicketId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const add = async () => {
    const value = ticketId.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      await props.onAdd(value);
      setTicketId("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ padding: "1rem" }}>
      <Title>Tickets vinculados</Title>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Input value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="ID do ticket" />
        <Button type="button" variant="primary" onClick={add} disabled={submitting}>
          {submitting ? "Vinculando..." : "Vincular"}
        </Button>
      </div>

      {props.links.length ? (
        <div>
          {props.links.map((l) => (
            <Row key={l.id}>
              <div style={{ fontWeight: 700 }}>{l.ticketId}</div>
              <Button type="button" variant="ghost" onClick={() => props.onRemove(l.id)}>
                Remover
              </Button>
            </Row>
          ))}
        </div>
      ) : (
        <Muted>Nenhum ticket vinculado.</Muted>
      )}
    </Card>
  );
}

