import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FiAlertCircle, FiClock, FiHash } from "@/components/icons";

const StateCard = styled(Card)`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[5]};
`;

const StateIcon = styled.span<{ $tone: "loading" | "error" | "empty" }>`
  width: 2.4rem;
  height: 2.4rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme, $tone }) =>
    $tone === "error" ? theme.tokens.color.status.warning : theme.tokens.color.interactive.primary};
  background: ${({ theme, $tone }) =>
    $tone === "error" ? theme.tokens.color.status.warningSurface : theme.tokens.color.bg.surfaceAlt};

  svg {
    ${({ $tone, theme }) =>
      $tone === "loading"
        ? `animation: spin ${theme.motion.slow} linear infinite;`
        : ""}
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
  }
`;

const StateTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const StateText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

interface FeedbackStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  role?: React.AriaRole;
  tone: "loading" | "error" | "empty";
}

function FeedbackState({ title, description, actionLabel, onAction, role, tone }: FeedbackStateProps) {
  const icon = tone === "error" ? <FiAlertCircle aria-hidden="true" /> : tone === "empty" ? <FiHash aria-hidden="true" /> : <FiClock aria-hidden="true" />;
  return (
    <StateCard role={role} aria-live={tone === "error" ? "assertive" : "polite"}>
      <StateIcon $tone={tone}>{icon}</StateIcon>
      <StateTitle>{title}</StateTitle>
      <StateText>{description}</StateText>
      {actionLabel && onAction ? (
        <div>
          <Button type="button" variant="ghost" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </StateCard>
  );
}

export function LoadingState({ title = "Carregando", description = "Aguarde um momento..." }) {
  return <FeedbackState title={title} description={description} role="status" tone="loading" />;
}

export function ErrorState({
  title = "Não foi possível carregar",
  description = "Tente novamente em instantes.",
  actionLabel = "Tentar novamente",
  onAction
}: Omit<FeedbackStateProps, "role" | "tone">) {
  return (
    <FeedbackState
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      role="alert"
      tone="error"
    />
  );
}

export function EmptyState({
  title = "Nada por aqui",
  description = "Ajuste os filtros para ver resultados."
}: Omit<FeedbackStateProps, "role" | "actionLabel" | "onAction" | "tone">) {
  return <FeedbackState title={title} description={description} tone="empty" />;
}
