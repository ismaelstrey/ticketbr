"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { CustomerSlaSummary } from "@/types/customerDashboard";

type TicketDetail = {
  id: string;
  number: number;
  subject: string;
  description: string | null;
  status: string;
  portalStatus: {
    label: string;
    timelineTitle: string;
    description: string;
    nextActionHint: string;
  } | null;
  priority: string;
  sla: CustomerSlaSummary;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{ id: string; author: string | null; authorId?: string | null; message: string | null; createdAt: string }>;
};

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const MainCard = styled(Card)`
  padding: 0;
  display: grid;
  grid-template-rows: auto auto minmax(420px, 1fr) auto;
  min-height: calc(100vh - 3rem);
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-start;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const UpdatedAt = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const BadgeRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const StatusSummary = styled.div`
  margin: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]} 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0.85rem;
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

const ChatList = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SystemMessage = styled.div`
  align-self: center;
  max-width: 720px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing[3]};
  white-space: pre-wrap;
`;

const Bubble = styled.div<{ $customer?: boolean }>`
  align-self: ${({ $customer }) => ($customer ? "flex-end" : "flex-start")};
  max-width: min(680px, 78%);
  border: 1px solid ${({ theme, $customer }) => ($customer ? `${theme.colors.primary}55` : theme.colors.border)};
  background: ${({ theme, $customer }) => ($customer ? `${theme.colors.primary}18` : theme.colors.surface)};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.75rem 0.85rem;
  box-shadow: ${({ theme }) => theme.shadows.card};
  white-space: pre-wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: 92%;
  }
`;

const BubbleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
`;

const BubbleAuthor = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Composer = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.surface};
`;

const ComposerActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SideStack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[3]};
  align-content: start;
`;

const SideCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SideTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SideLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SideValue = styled.div`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SlaBar = styled.div`
  height: 0.55rem;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow: hidden;
`;

const SlaFill = styled.div<{ $value: number; $state: string }>`
  width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
  height: 100%;
  background: ${({ theme, $state }) =>
    $state === "OVERDUE"
      ? theme.colors.status.warning
      : $state === "AT_RISK"
        ? theme.colors.status.purple
        : theme.colors.status.success};
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.warning};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function priorityLabel(priority: string) {
  if (priority === "HIGH") return "Alta";
  if (priority === "MEDIUM") return "Media";
  return "Normal";
}

function slaTone(state: string): "neutral" | "success" | "warning" | "info" {
  if (state === "OVERDUE") return "warning";
  if (state === "AT_RISK") return "info";
  if (state === "DONE" || state === "ON_TRACK") return "success";
  return "neutral";
}

export default function CustomerTicketPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/tickets/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      setTicket(json.data || null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ticket?.comments.length]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/customer/tickets/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Falha ao enviar mensagem");
      setMessage("");
      await load();
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch (error: any) {
      setSendError(error?.message || "Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingState title="Carregando ticket" description="Buscando os detalhes da solicitacao." />;
  }

  if (!ticket) {
    return <EmptyState title="Ticket nao encontrado" description="Verifique o link ou volte para a listagem." />;
  }

  return (
    <Layout>
      <MainCard>
        <Header>
          <div>
            <Title>#{ticket.number} - {ticket.subject}</Title>
            <UpdatedAt>Atualizado em {formatDate(ticket.updatedAt)}</UpdatedAt>
          </div>
          <BadgeRow>
            <Badge>{ticket.portalStatus?.label || ticket.status}</Badge>
            <Badge>{priorityLabel(ticket.priority)}</Badge>
            <Badge tone={slaTone(ticket.sla?.state)}>{ticket.sla?.label || "Sem SLA"}</Badge>
          </BadgeRow>
        </Header>

        {ticket.portalStatus ? (
          <StatusSummary aria-label="Resumo do status do ticket">
            <StatusSummaryTitle>{ticket.portalStatus.timelineTitle}</StatusSummaryTitle>
            <StatusSummaryBody>{ticket.portalStatus.description}</StatusSummaryBody>
            <StatusSummaryBody>{ticket.portalStatus.nextActionHint}</StatusSummaryBody>
          </StatusSummary>
        ) : null}

        <ChatList>
          <SystemMessage>
            {ticket.description || "Ticket aberto sem descricao."}
          </SystemMessage>

          {ticket.comments.length ? ticket.comments.map((comment) => {
            const isCustomer = comment.authorId != null;
            return (
              <Bubble key={comment.id} $customer={isCustomer}>
                <BubbleHeader>
                  <BubbleAuthor>{comment.author || (isCustomer ? "Cliente" : "Atendimento")}</BubbleAuthor>
                  <span>{formatDate(comment.createdAt)}</span>
                </BubbleHeader>
                {comment.message || ""}
              </Bubble>
            );
          }) : (
            <SystemMessage>Nenhuma mensagem ainda. Use o campo abaixo para falar com o atendimento sobre este ticket.</SystemMessage>
          )}
          <div ref={endRef} />
        </ChatList>

        <Composer>
          {sendError ? <ErrorText role="alert">{sendError}</ErrorText> : null}
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            style={{ minHeight: 96 }}
            placeholder="Escreva sua mensagem. Enter envia, Shift+Enter quebra linha."
          />
          <ComposerActions>
            <Button type="button" variant="primary" onClick={() => send()} disabled={sending || !message.trim()}>
              {sending ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </ComposerActions>
        </Composer>
      </MainCard>

      <SideStack>
        <SideCard>
          <SideTitle>Detalhes</SideTitle>
          <SideLabel>Categoria</SideLabel>
          <SideValue>{ticket.category?.name || "-"}</SideValue>
          <SideLabel>Criado em</SideLabel>
          <SideValue>{formatDate(ticket.createdAt)}</SideValue>
          <SideLabel>Status</SideLabel>
          <SideValue>{ticket.portalStatus?.label || ticket.status}</SideValue>
        </SideCard>

        <SideCard>
          <SideTitle>SLA</SideTitle>
          <Badge tone={slaTone(ticket.sla?.state)}>{ticket.sla?.label || "Sem SLA"}</Badge>
          {typeof ticket.sla?.progress === "number" ? (
            <SlaBar aria-label={`SLA ${ticket.sla.progress}%`}>
              <SlaFill $value={ticket.sla.progress} $state={ticket.sla.state} />
            </SlaBar>
          ) : null}
          <SideLabel>Prazo de resposta</SideLabel>
          <SideValue>{formatDate(ticket.sla?.responseSlaAt || null)}</SideValue>
          <SideLabel>Prazo de solucao</SideLabel>
          <SideValue>{formatDate(ticket.sla?.solutionSlaAt || null)}</SideValue>
        </SideCard>
      </SideStack>
    </Layout>
  );
}
