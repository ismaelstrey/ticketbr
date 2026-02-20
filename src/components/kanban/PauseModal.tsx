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

const Label = styled.label`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.88rem;
  font-weight: 600;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

export const PAUSE_REASONS = [
  "Aguardando retorno do cliente",
  "Aguardando fornecedor terceiro",
  "Dependência de outra equipe",
  "Janela de manutenção agendada",
  "Sem expediente do cliente",
  "Outro"
] as const;

interface PauseModalProps {
  ticket: Ticket;
  reason: string;
  setReason: (reason: string) => void;
  pauseSla: boolean;
  setPauseSla: (pauseSla: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function PauseModal({
  ticket,
  reason,
  setReason,
  pauseSla,
  setPauseSla,
  onClose,
  onConfirm
}: PauseModalProps) {
  const isOtherReason = reason === "Outro" || (reason.trim() !== "" && !PAUSE_REASONS.includes(reason as (typeof PAUSE_REASONS)[number]));

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

        <Label htmlFor="pause-reason">Motivo da pausa</Label>
        <Select id="pause-reason" value={isOtherReason ? "Outro" : reason} onChange={(event) => setReason(event.target.value)}>
          <option value="" disabled>
            Selecione um motivo
          </option>
          {PAUSE_REASONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>

        {isOtherReason && (
          <>
            <Label htmlFor="pause-other-reason">Descreva o motivo</Label>
            <Textarea
              id="pause-other-reason"
              placeholder="Descreva o motivo da pausa do ticket..."
              value={reason === "Outro" ? "" : reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </>
        )}

        <CheckboxLabel>
          <input type="checkbox" checked={pauseSla} onChange={(event) => setPauseSla(event.target.checked)} />
          Pausar contagem do SLA durante esta pausa
        </CheckboxLabel>

        <Actions>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="save" onClick={onConfirm} disabled={!reason.trim() || reason === "Outro"}>
            Confirmar pausa
          </Button>
        </Actions>
      </ModalContent>
    </Overlay>
  );
}
