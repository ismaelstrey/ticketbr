"use client";

import React from "react";
import styled from "styled-components";
import { Ticket } from "@/types/ticket";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(19, 24, 39, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 40;
`;

const ModalContent = styled.div`
  width: min(760px, 100%);
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 1.05rem;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.92rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

interface PauseModalProps {
  ticket: Ticket;
  reason: string;
  setReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function PauseModal({
  ticket,
  reason,
  setReason,
  onClose,
  onConfirm
}: PauseModalProps) {
  return (
    <Overlay role="dialog" aria-modal="true">
      <ModalContent>
        <Header>
          <h3>
            Pausar ticket #{ticket.id} - {ticket.assunto}
          </h3>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </Header>

        <Subtitle>
          Informe o motivo da pausa para registrar no ticket antes de mover para a coluna Pausado.
        </Subtitle>

        <Textarea
          placeholder="Descreva o motivo da pausa do ticket..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />

        <Actions>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="save" onClick={onConfirm} disabled={!reason.trim()}>
            Confirmar pausa
          </Button>
        </Actions>
      </ModalContent>
    </Overlay>
  );
}
