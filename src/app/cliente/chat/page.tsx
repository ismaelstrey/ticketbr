"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { ChatMessage } from "@/types/chat";

const Frame = styled.section`
  height: calc(100vh - 3rem);
  min-height: 560px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  overflow: hidden;
`;

const Header = styled.header`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceElevated};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MessageList = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Bubble = styled.div<{ $customer?: boolean }>`
  align-self: ${({ $customer }) => ($customer ? "flex-end" : "flex-start")};
  max-width: min(680px, 82%);
  border: 1px solid ${({ theme, $customer }) => ($customer ? `${theme.colors.primary}55` : theme.colors.border)};
  background: ${({ theme, $customer }) => ($customer ? `${theme.colors.primary}18` : theme.colors.surfaceAlt)};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.75rem 0.85rem;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: 94%;
  }
`;

const Meta = styled.div`
  margin-top: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.xs};
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

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.warning};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function CustomerChatPage() {
  const { company, user, loading: authLoading } = useCustomerAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/customer/chat/messages", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar chat");
    setMessages(Array.isArray(json.data) ? json.data : []);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load()
      .catch((err) => setError(err?.message || "Erro ao carregar chat"))
      .finally(() => setLoading(false));
  }, [authLoading, load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/customer/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao enviar mensagem");
      setText("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingState title="Carregando chat" description="Abrindo seu canal com o atendimento." />;
  }

  return (
    <Frame>
      <Header>
        <Title>Atendimento</Title>
        <Subtitle>{company?.name || user?.name || "Canal direto com o suporte"}</Subtitle>
      </Header>

      <MessageList>
        {error ? <ErrorText role="alert">{error}</ErrorText> : null}
        {!messages.length ? (
          <EmptyState title="Nenhuma mensagem ainda" description="Envie sua primeira mensagem para iniciar o atendimento." />
        ) : messages.map((message) => {
          const isCustomer = message.direction === "in";
          return (
            <Bubble key={message.id} $customer={isCustomer}>
              {message.text || ""}
              <Meta>{isCustomer ? "Voce" : "Atendimento"} - {formatDate(message.createdAt)}</Meta>
            </Bubble>
          );
        })}
        <div ref={endRef} />
      </MessageList>

      <Composer>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Digite sua mensagem. Enter envia, Shift+Enter quebra linha."
        />
        <ComposerActions>
          <Button type="button" variant="primary" onClick={() => send()} disabled={sending || !text.trim()}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </ComposerActions>
      </Composer>
    </Frame>
  );
}
