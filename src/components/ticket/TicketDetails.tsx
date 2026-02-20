"use client";

import React from "react";
import styled from "styled-components";
import {
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiHash,
  FiSearch,
  FiTool,
  FiUser,
  FiPlus
} from "@/components/icons";
import { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import NewCommentModal from "./NewCommentModal";

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;

  h2 {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #f97316;
    white-space: nowrap;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const TopFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const FilterTag = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.4rem 0.65rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
`;

const ContentGrid = styled.section`
  display: grid;
  grid-template-columns: 1.9fr 1fr;
  gap: 0.9rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const RoadmapWrapper = styled(Card)`
  padding: 1rem;
`;

const RoadmapTitle = styled.h3`
  margin: 0 0 0.9rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Timeline = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-left: 2rem;

  &::before {
    content: "";
    position: absolute;
    left: 0.68rem;
    top: 0.2rem;
    bottom: 0.2rem;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const TimelineItem = styled.article`
  position: relative;
`;

const TimelineMarker = styled.span<{ $bg: string }>`
  position: absolute;
  left: -2rem;
  top: 0.65rem;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: ${({ $bg }) => $bg};
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.border};
`;

const TimelineCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: 0.75rem 0.85rem;

  p {
    margin: 0.25rem 0 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const TimelineHead = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.85rem;
  }
`;

const EventBadge = styled.span<{ $tone: string }>`
  font-size: 0.75rem !important;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  border: 1px solid ${({ $tone }) => $tone};
  color: ${({ $tone }) => $tone} !important;
`;

const SidebarForm = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const Metric = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.35rem;

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.95rem;
  }
`;

const FormLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
`;

const UpdatedAt = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
`;

const statusLabels: Record<TicketStatus, string> = {
  todo: "A fazer",
  doing: "Atendendo",
  paused: "Pausado",
  done: "Finalizado"
};

function getRoadmapColor(eventType: string) {
  if (eventType === "CREATED") return "#22c55e";
  if (eventType === "PAUSED") return "#f59e0b";
  if (eventType === "STATUS_CHANGED") return "#3b82f6";
  if (eventType === "COMMENT") return "#6366f1";
  if (eventType === "UPDATED") return "#a855f7";
  return "#6b7280";
}

function getRoadmapTypeLabel(eventType: string) {
  if (eventType === "CREATED") return "Criado";
  if (eventType === "PAUSED") return "Pausado";
  if (eventType === "STATUS_CHANGED") return "Status";
  if (eventType === "COMMENT") return "Comentário";
  if (eventType === "UPDATED") return "Atualização";
  return eventType;
}

function formatRoadmapDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

export default function TicketDetails({
  ticket,
  onBack,
  onChange,
  onSave
}: {
  ticket: Ticket;
  onBack: () => void;
  onChange: (changes: Partial<Ticket>) => void;
  onSave: () => void;
}) {
  const [isCommentModalOpen, setIsCommentModalOpen] = React.useState(false);

  return (
    <Container>
      <NewCommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        ticketId={ticket.id}
        onCommentAdded={(updatedTicket) => onChange(updatedTicket)}
      />
      <Header>
        <Button variant="ghost" onClick={onBack}>
          ← Voltar ao Kanban
        </Button>

        <TitleWrapper>
          <h2>
            <FiHash aria-hidden="true" /> {ticket.number}
          </h2>
          <Input
            value={ticket.assunto}
            onChange={(event) => onChange({ assunto: event.target.value })}
          />
        </TitleWrapper>

        <Button variant="save" onClick={onSave}>
          <FiCheckCircle aria-hidden="true" /> Salvar
        </Button>
      </Header>

      <TopFilters>
        <FilterTag>
          <FiFilter aria-hidden="true" /> Filtrar
        </FilterTag>
        <FilterTag>
          <FiSearch aria-hidden="true" /> Pesquisar
        </FilterTag>
        <Button variant="ghost" onClick={() => setIsCommentModalOpen(true)} style={{ padding: "0.4rem 0.65rem", fontSize: "0.85rem" }}>
          <FiPlus /> Adicionar Comentário
        </Button>
        <FilterTag>Anexos</FilterTag>
        <FilterTag>Checklist</FilterTag>
      </TopFilters>

      <ContentGrid>
        <RoadmapWrapper>
          <RoadmapTitle>Roadmap</RoadmapTitle>
          <Timeline>
            {(ticket.roadmap && ticket.roadmap.length > 0 ? ticket.roadmap : []).map((event) => {
              const markerColor = getRoadmapColor(event.type);
              const transition =
                event.fromStatus && event.toStatus
                  ? ` (${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]})`
                  : "";

              return (
                <TimelineItem key={event.id}>
                  <TimelineMarker $bg={markerColor} />
                  <TimelineCard>
                    <TimelineHead>
                      <strong>{event.author ?? "Sistema"}</strong>
                      <span>{formatRoadmapDate(event.createdAt)}</span>
                      <EventBadge $tone={markerColor}>{getRoadmapTypeLabel(event.type)}</EventBadge>
                    </TimelineHead>
                    <p>
                      <strong>{event.title}</strong>
                      {transition}
                    </p>
                    {event.description ? <p>{event.description}</p> : null}
                    {event.pauseReason ? (
                      <p>
                        <strong>Motivo da pausa:</strong> {event.pauseReason}
                      </p>
                    ) : null}
                  </TimelineCard>
                </TimelineItem>
              );
            })}
            {(!ticket.roadmap || ticket.roadmap.length === 0) && (
              <TimelineItem>
                <TimelineMarker $bg="#9ca3af" />
                <TimelineCard>
                  <p>Sem histórico registrado para este ticket.</p>
                </TimelineCard>
              </TimelineItem>
            )}
          </Timeline>
        </RoadmapWrapper>

        <SidebarForm>
          <Metric>
            <p>Data de criação</p>
            <strong>{ticket.dataCriacao ?? ticket.data}</strong>
          </Metric>

          <Metric>
            <p>SLA Resposta</p>
            <strong>{ticket.slaResposta ?? "-"}</strong>
          </Metric>

          <Metric>
            <p>SLA Solução</p>
            <strong>{ticket.slaSolucao ?? "-"}</strong>
          </Metric>

          <FormLabel>
            Prioridade
            <Select
              value={ticket.prioridade}
              onChange={(event) => onChange({ prioridade: event.target.value as TicketPriority })}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Sem prioridade">Sem prioridade</option>
            </Select>
          </FormLabel>

          <FormLabel>
            Status
            <Select value={ticket.status} onChange={(event) => onChange({ status: event.target.value as TicketStatus })}>
              <option value="todo">{statusLabels.todo}</option>
              <option value="doing">{statusLabels.doing}</option>
              <option value="paused">{statusLabels.paused}</option>
              <option value="done">{statusLabels.done}</option>
            </Select>
          </FormLabel>

          <FormLabel>
            Contatos
            <Input value={ticket.contato ?? ""} onChange={(event) => onChange({ contato: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Tipo de Ticket
            <Input value={ticket.tipoTicket ?? ""} onChange={(event) => onChange({ tipoTicket: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Categorias
            <Input value={ticket.categoria ?? ""} onChange={(event) => onChange({ categoria: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Mesa de Trabalho
            <Input value={ticket.mesaTrabalho ?? ""} onChange={(event) => onChange({ mesaTrabalho: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Operador
            <Input value={ticket.operador ?? ""} onChange={(event) => onChange({ operador: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Descrição
            <Textarea value={ticket.descricao ?? ""} onChange={(event) => onChange({ descricao: event.target.value })} />
          </FormLabel>

          <FormLabel>
            Motivo da pausa
            <Textarea
              value={ticket.pauseReason ?? ""}
              onChange={(event) => onChange({ pauseReason: event.target.value })}
              placeholder="Descreva o motivo quando o ticket estiver pausado"
            />
          </FormLabel>

          <UpdatedAt>
            <FiClock aria-hidden="true" /> Última atualização: {ticket.data}
          </UpdatedAt>
          <UpdatedAt>
            <FiUser aria-hidden="true" /> Solicitante: {ticket.solicitante}
          </UpdatedAt>
          <UpdatedAt>
            <FiTool aria-hidden="true" /> Empresa: {ticket.empresa}
          </UpdatedAt>
        </SidebarForm>
      </ContentGrid>
    </Container>
  );
}
