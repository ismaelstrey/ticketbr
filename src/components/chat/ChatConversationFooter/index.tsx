"use client";

import { memo, useId, useMemo } from "react";
import { FooterSurface, FooterGrid, FieldGroup, LabelRow, Label, SubtleHint, MinimalSelect, Actions, PrimaryButton, SecondaryButton, IconWrap } from "./styles";
import type { ChatConversationFooterProps } from "./types";

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0 0-7.07 5 5 0 0 0-7.07 0L10.7 5.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 0 7.07 5 5 0 0 0 7.07 0l.71-.71"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16v3H4V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v10h12V10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 14h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Minimal, accessible footer controls for the chat conversation screen.
 * Uses an 8px spacing scale, subtle shadows, and consistent interactive states
 * without touching global styles.
 */
export const ChatConversationFooter = memo(function ChatConversationFooter(props: ChatConversationFooterProps) {
  const {
    tickets,
    selectedTicketId,
    onSelectedTicketIdChange,
    onAssociate,
    associateDisabled,
    showArchived,
    archivedConversations,
    activeArchivedId,
    onActiveArchivedIdChange,
    onFinalize,
    finalizeDisabled,
    finalizeLabel
  } = props;

  const ticketLabelId = useId();
  const archiveLabelId = useId();

  const archivedOptions = useMemo(() => {
    return archivedConversations.map((item) => {
      const dt = new Date(item.closedAt);
      const stamp = Number.isFinite(dt.getTime()) ? dt.toLocaleString("pt-BR") : item.closedAt;
      const suffix = typeof item.ticketNumber === "number" ? ` • Ticket #${item.ticketNumber}` : "";
      return { id: item.id, label: `${stamp}${suffix}` };
    });
  }, [archivedConversations]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  return (
    <FooterSurface aria-label="Chat footer controls">
      <FooterGrid>
        <FieldGroup>
          <LabelRow>
            <Label id={ticketLabelId}>Ticket</Label>
            <SubtleHint>
              {selectedTicket
                ? `${selectedTicket.priorityLabel ?? "Sem prioridade"} • ${selectedTicket.slaLabel ?? "SLA não definido"}`
                : "Vincular conversa"}
            </SubtleHint>
          </LabelRow>
          <MinimalSelect
            aria-labelledby={ticketLabelId}
            value={selectedTicketId}
            onChange={(e) => onSelectedTicketIdChange(e.target.value)}
          >
            <option value="">Associar a um ticket...</option>
            {tickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                #{ticket.number} — {ticket.subject}
              </option>
            ))}
          </MinimalSelect>
        </FieldGroup>

        {showArchived ? (
          <FieldGroup>
            <LabelRow>
              <Label id={archiveLabelId}>Histórico</Label>
              <SubtleHint>Conversas finalizadas</SubtleHint>
            </LabelRow>
            <MinimalSelect
              aria-labelledby={archiveLabelId}
              value={activeArchivedId}
              onChange={(e) => onActiveArchivedIdChange(e.target.value)}
            >
              <option value="">Abrir conversa finalizada...</option>
              {archivedOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </MinimalSelect>
          </FieldGroup>
        ) : null}

        <Actions aria-label="Chat footer actions">
          <PrimaryButton
            type="button"
            variant="save"
            disabled={Boolean(associateDisabled)}
            onClick={onAssociate}
          >
            <IconWrap>
              <LinkIcon />
            </IconWrap>
            Associar
          </PrimaryButton>

          <SecondaryButton
            type="button"
            variant="ghost"
            disabled={Boolean(finalizeDisabled)}
            onClick={onFinalize}
          >
            <IconWrap>
              <ArchiveIcon />
            </IconWrap>
            {finalizeLabel ?? "Finalizar conversa"}
          </SecondaryButton>
        </Actions>
      </FooterGrid>
    </FooterSurface>
  );
});
