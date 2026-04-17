"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type TicketDetail = {
  id: string;
  number: number;
  subject: string;
  description: string | null;
  status: string;
  portalStatus: {
    key: string;
    tone: "info" | "warning" | "success";
    label: string;
    timelineTitle: string;
    description: string;
    nextActionHint: string;
  } | null;
  priority: string;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{ id: string; author: string | null; message: string | null; createdAt: string }>;
};

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
`;

const StatusSummary = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0.75rem 0.85rem;
  display: grid;
  gap: 0.35rem;
`;

const StatusSummaryTitle = styled.div`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusSummaryBody = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

export default function CustomerTicketPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/tickets/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      setTicket(json.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/customer/tickets/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      setMessage("");
      await load();
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "1rem" }}>Carregando...</div>;
  }

  if (!ticket) {
    return <div style={{ padding: "1rem" }}>Ticket não encontrado.</div>;
  }

  return (
    <Layout>
      <Card style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <Title>#{ticket.number} · {ticket.subject}</Title>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>Atualizado em {formatDate(ticket.updatedAt)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge>{ticket.portalStatus?.label || ticket.status}</Badge>
            <Badge>{ticket.priority}</Badge>
          </div>
        </div>

        {ticket.portalStatus ? (
          <StatusSummary aria-label="Resumo do status do ticket">
            <StatusSummaryTitle>{ticket.portalStatus.timelineTitle}</StatusSummaryTitle>
            <StatusSummaryBody>{ticket.portalStatus.description}</StatusSummaryBody>
            <StatusSummaryBody>{ticket.portalStatus.nextActionHint}</StatusSummaryBody>
          </StatusSummary>
        ) : null}

        <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{ticket.description || ""}</div>

        <div style={{ marginTop: 8, fontWeight: 800 }}>Comentários</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
          {ticket.comments.length ? ticket.comments.map((c) => (
            <Card key={c.id} style={{ padding: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{c.author || "Cliente"}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{formatDate(c.createdAt)}</div>
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{c.message || ""}</div>
            </Card>
          )) : <div style={{ opacity: 0.75, fontSize: 14 }}>Nenhum comentário ainda.</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: "100%", minHeight: 110, borderRadius: 12, border: "1px solid rgba(148,163,184,0.35)", padding: 12, background: "transparent", color: "inherit" }}
            placeholder="Escreva sua mensagem"
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="button" variant="primary" onClick={() => send()} disabled={sending}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Detalhes</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Categoria</div>
        <div style={{ fontWeight: 700 }}>{ticket.category?.name || "-"}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>Criado em</div>
        <div style={{ fontWeight: 700 }}>{formatDate(ticket.createdAt)}</div>
      </Card>
    </Layout>
  );
}
