"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";

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
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: ${({ theme }) => theme.tokens.color.text.primary};
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

const MainCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-start;
  flex-wrap: wrap;
`;

const UpdatedAt = styled.div`
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const BadgeRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
`;

const Description = styled.div`
  white-space: pre-wrap;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const SectionTitle = styled.h2`
  margin: ${({ theme }) => `${theme.spacing[2]} 0 0`};
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  max-height: 420px;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing[1]};
`;

const CommentCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const CommentAuthor = styled.div`
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const CommentDate = styled.div`
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
`;

const EmptyComments = styled.div`
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const CommentComposer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ComposerActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SideCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SideTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const SideLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const SideValue = styled.div`
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
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
    return <LoadingState title="Carregando ticket" description="Buscando os detalhes da solicitação." />;
  }

  if (!ticket) {
    return <EmptyState title="Ticket não encontrado" description="Verifique o link ou volte para a listagem." />;
  }

  return (
    <Layout>
      <MainCard>
        <HeaderRow>
          <div>
            <Title>#{ticket.number} · {ticket.subject}</Title>
            <UpdatedAt>Atualizado em {formatDate(ticket.updatedAt)}</UpdatedAt>
          </div>
          <BadgeRow>
            <Badge>{ticket.portalStatus?.label || "Status indisponível"}</Badge>
            <Badge>{ticket.priority}</Badge>
          </BadgeRow>
        </HeaderRow>

        {ticket.portalStatus ? (
          <StatusSummary aria-label="Resumo do status do ticket">
            <StatusSummaryTitle>{ticket.portalStatus.timelineTitle}</StatusSummaryTitle>
            <StatusSummaryBody>{ticket.portalStatus.description}</StatusSummaryBody>
            <StatusSummaryBody>{ticket.portalStatus.nextActionHint}</StatusSummaryBody>
          </StatusSummary>
        ) : null}

        <Description>{ticket.description || ""}</Description>

        <SectionTitle>Comentários</SectionTitle>
        <CommentsList>
          {ticket.comments.length ? ticket.comments.map((c) => (
            <CommentCard key={c.id}>
              <CommentHeader>
                <CommentAuthor>{c.author || "Cliente"}</CommentAuthor>
                <CommentDate>{formatDate(c.createdAt)}</CommentDate>
              </CommentHeader>
              <Description>{c.message || ""}</Description>
            </CommentCard>
          )) : <EmptyComments>Nenhum comentário ainda.</EmptyComments>}
        </CommentsList>

        <CommentComposer>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ minHeight: 110 }}
            placeholder="Escreva sua mensagem"
          />
          <ComposerActions>
            <Button type="button" variant="primary" onClick={() => send()} disabled={sending}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </ComposerActions>
        </CommentComposer>
      </MainCard>

      <SideCard>
        <SideTitle>Detalhes</SideTitle>
        <SideLabel>Categoria</SideLabel>
        <SideValue>{ticket.category?.name || "-"}</SideValue>
        <SideLabel>Criado em</SideLabel>
        <SideValue>{formatDate(ticket.createdAt)}</SideValue>
      </SideCard>
    </Layout>
  );
}
