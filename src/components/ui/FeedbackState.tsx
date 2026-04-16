import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const StateCard = styled(Card)`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[5]};
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
}

function FeedbackState({ title, description, actionLabel, onAction, role }: FeedbackStateProps) {
  return (
    <StateCard role={role}>
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
  return <FeedbackState title={title} description={description} role="status" />;
}

export function ErrorState({
  title = "Não foi possível carregar",
  description = "Tente novamente em instantes.",
  actionLabel = "Tentar novamente",
  onAction
}: Omit<FeedbackStateProps, "role">) {
  return (
    <FeedbackState
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      role="alert"
    />
  );
}

export function EmptyState({
  title = "Nada por aqui",
  description = "Ajuste os filtros para ver resultados."
}: Omit<FeedbackStateProps, "role" | "actionLabel" | "onAction">) {
  return <FeedbackState title={title} description={description} />;
}

