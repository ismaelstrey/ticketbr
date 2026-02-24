"use client";

import React, { DragEvent } from "react";
import styled from "styled-components";
import { FiHash, FiUser, FiTool, FiClock } from "@/components/icons";
import { Ticket } from "@/types/ticket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSlaColor, getSlaLabel } from "@/lib/sla";

const StyledCard = styled(Card)`
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`;

const TicketId = styled.p`
  color: #26a8d9;
  font-weight: 800;
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
`;

const CompanyName = styled.p`
  font-weight: 700;
  margin: 0;
  font-size: 0.9rem;
`;

const InfoRow = styled.p`
  margin: 0.25rem 0;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.65rem 0;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.45rem;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StyledProgress = styled.progress<{ $barColor: string }>`
  width: 100%;
  height: 8px;
  appearance: none;

  &::-webkit-progress-bar {
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.column.background};
  }

  &::-webkit-progress-value {
    border-radius: 999px;
    background: ${({ $barColor }) => $barColor};
  }
`;

interface TicketCardProps {
  ticket: Ticket;
  onDragStart: (event: DragEvent<HTMLElement>, ticketId: string) => void;
  onDragEnd: () => void;
  onOpen: (ticketId: string) => void;
}

export function TicketCard({
  ticket,
  onDragStart,
  onDragEnd,
  onOpen
}: TicketCardProps) {
  const slaColor = getSlaColor(ticket.progressoSla);
  const slaLabel = getSlaLabel(ticket.progressoSla);

  return (
    <StyledCard
      draggable
      onDragStart={(event: any) => onDragStart(event, ticket.id)}
      onDragEnd={onDragEnd}
      role="button"
      onClick={() => onOpen(ticket.id)}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      layoutId={ticket.id}
    >
      <TicketId>
        <FiHash aria-hidden="true" /> {ticket.number}
      </TicketId>
      <CompanyName>{ticket.empresa}</CompanyName>
      <InfoRow>
        <FiUser aria-hidden="true" /> {ticket.solicitante}
      </InfoRow>
      <InfoRow>
        <FiTool aria-hidden="true" /> {ticket.assunto}
      </InfoRow>
      <MetaRow>
        <Badge priority={ticket.prioridade}>{ticket.prioridade}</Badge>
        <span>
          <FiClock aria-hidden="true" /> {ticket.data}
        </span>
      </MetaRow>
      <ProgressGrid>
        <ProgressLabel>
          <strong>{slaLabel}</strong>
          <span>{ticket.progressoSla}%</span>
        </ProgressLabel>
        <StyledProgress max={100} value={ticket.progressoSla} $barColor={slaColor} />

        <ProgressLabel>
          <span>Andamento</span>
          <span>{ticket.progressoTarefa}%</span>
        </ProgressLabel>
        <StyledProgress max={100} value={ticket.progressoTarefa} $barColor="#18b5d9" />
      </ProgressGrid>
    </StyledCard>
  );
}
