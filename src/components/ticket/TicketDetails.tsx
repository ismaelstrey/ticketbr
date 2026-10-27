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
import { getPriorityChipLabel, getSlaChipLabel, getSlaToneColor, getSlaToneFromProgress } from "@/lib/tickets/sla-chip";
import { SlaCountdown } from "@/components/ui/SlaCountdown";
import { api } from "@/services/api";
import NewCommentModal from "./NewCommentModal";

// Opções de domínio usadas nos selects do formulário de ticket
type TicketLookups = {
  tipos: Array<{ id: string; nome: string }>;
  categorias: Array<{ id: string; nome: string; tipo_ticket_id: string }>;
  mesas: Array<{ id: string; nome: string }>;
  operadores: Array<{ id: string; nome: string }>;
};

const emptyLookups: TicketLookups = { tipos: [], categorias: [], mesas: [], operadores: [] };

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
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    font-size: 0.72rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.muted};
    background: ${({ theme }) => theme.colors.surfaceAlt};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.pill};
    padding: 0.05rem 0.5rem;
  }
`;

// Coluna do marcador com largura fixa: a linha conectora fica exatamente no centro dela
const MARKER_COLUMN = "1.5rem";
const MARKER_CENTER = "0.75rem";
const MARKER_OFFSET = "1rem";

const Timeline = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TimelineItem = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: ${MARKER_COLUMN} 1fr;
  column-gap: ${({ theme }) => theme.spacing[3]};
  align-items: start;

  /* Conector contínuo: parte do marcador atual e alcança o centro do próximo */
  &::before {
    content: "";
    position: absolute;
    left: ${MARKER_CENTER};
    top: ${MARKER_OFFSET};
    bottom: calc(-1 * ${({ theme }) => theme.spacing[3]} - ${MARKER_OFFSET});
    width: 2px;
    transform: translateX(-50%);
    background: ${({ theme }) => theme.colors.border};
  }

  &:last-child::before {
    display: none;
  }
`;

const TimelineMarker = styled.span<{ $bg: string }>`
  grid-column: 1;
  justify-self: center;
  align-self: start;
  position: relative;
  z-index: 1;
  width: 16px;
  height: 16px;
  margin-top: 0.5rem;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  border: 3px solid ${({ theme }) => theme.colors.surface};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.border};
`;

const TimelineCard = styled(Card)`
  grid-column: 2;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.surface};
  padding: 0.7rem 0.85rem;
  box-shadow: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: ${({ theme }) => theme.shadows.card};
  }
`;

const TimelineHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.9rem;
  }
`;

const TimelineTime = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const TimelineTitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;

  span {
    margin-left: 0.35rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 500;
  }
`;

const TimelineDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
  line-height: 1.45;
  overflow-wrap: anywhere;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const EventBadge = styled.span<{ $tone: string }>`
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.1rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.6;
  border: 1px solid ${({ $tone }) => $tone};
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `${$tone}14`};
`;

const SidebarForm = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.45rem;

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.95rem;
  }
`;

// Linha auxiliar do SLA (contagem regressiva ou confirmação de resposta).
// `$tone="success"` destaca a primeira interação, que já cumpre o prazo de resposta.
const CountdownLine = styled.div<{ $tone?: "muted" | "success" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.3;
  color: ${({ theme, $tone }) =>
    $tone === "success" ? theme.tokens.color.status.success : theme.colors.text.secondary};
  font-weight: ${({ $tone }) => ($tone === "success" ? 600 : 400)};

  svg {
    flex-shrink: 0;
  }
`;

const SummaryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const SummaryChip = styled.span<{ $tone: string }>`
  border: 1px solid ${({ $tone }) => $tone};
  color: ${({ $tone }) => $tone};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
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
  if (eventType === "CHAT_MESSAGE") return "#25d366";
  return "#6b7280";
}

function getRoadmapTypeLabel(eventType: string) {
  if (eventType === "CREATED") return "Criado";
  if (eventType === "PAUSED") return "Pausado";
  if (eventType === "STATUS_CHANGED") return "Status";
  if (eventType === "COMMENT") return "Comentário";
  if (eventType === "UPDATED") return "Atualização";
  if (eventType === "CHAT_MESSAGE") return "WhatsApp";
  return eventType;
}

/** Formata uma data no padrão brasileiro (ex.: 26/10/2026, 13:50). */
function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Valores já pré-formatados pelo backend (ex.: ticket.data) passam direto
    return typeof value === "string" ? value : "-";
  }
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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
  const [lookups, setLookups] = React.useState<TicketLookups>(emptyLookups);

  // Carrega as opções de domínio (tipo, categoria, mesa e operador) para os selects
  React.useEffect(() => {
    let active = true;
    api.tickets
      .lookups()
      .then((res) => {
        if (active) setLookups(res.data ?? emptyLookups);
      })
      .catch(() => {
        if (active) setLookups(emptyLookups);
      });
    return () => {
      active = false;
    };
  }, []);

  // Filtra as categorias vinculadas ao tipo de ticket selecionado
  const categoriaOptions = lookups.categorias.filter(
    (categoria) => !ticket.tipoTicketId || categoria.tipo_ticket_id === ticket.tipoTicketId
  );

  const roadmapEvents = ticket.roadmap ?? [];

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
          <RoadmapTitle>
            Roadmap
            {roadmapEvents.length > 0 && <span>{roadmapEvents.length}</span>}
          </RoadmapTitle>
          <Timeline>
            {roadmapEvents.length === 0 ? (
              <TimelineItem>
                <TimelineMarker $bg="#9ca3af" />
                <TimelineCard>
                  <TimelineDescription>Sem histórico registrado para este ticket.</TimelineDescription>
                </TimelineCard>
              </TimelineItem>
            ) : (
              roadmapEvents.map((event) => {
                const markerColor = getRoadmapColor(event.type);
                const transition =
                  event.fromStatus && event.toStatus
                    ? `(${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]})`
                    : "";

                return (
                  <TimelineItem key={event.id}>
                    <TimelineMarker $bg={markerColor} />
                    <TimelineCard>
                      <TimelineHead>
                        <EventBadge $tone={markerColor}>{getRoadmapTypeLabel(event.type)}</EventBadge>
                        <strong>{event.author ?? "Sistema"}</strong>
                        <TimelineTime>{formatDateTime(event.createdAt)}</TimelineTime>
                      </TimelineHead>
                      <TimelineTitle>
                        {event.title}
                        {transition ? <span>{transition}</span> : null}
                      </TimelineTitle>
                      {event.description ? (
                        <TimelineDescription>{event.description}</TimelineDescription>
                      ) : null}
                      {event.pauseReason ? (
                        <TimelineDescription>
                          <strong>Motivo da pausa:</strong> {event.pauseReason}
                        </TimelineDescription>
                      ) : null}
                    </TimelineCard>
                  </TimelineItem>
                );
              })
            )}
          </Timeline>
        </RoadmapWrapper>

        <SidebarForm>
          <Metric>
            <p>Data de criação</p>
            <strong>{formatDateTime(ticket.dataCriacao ?? ticket.data)}</strong>
          </Metric>

          <Metric>
            <p>SLA Resposta</p>
            {ticket.slaResposta ? <strong>{formatDateTime(ticket.slaResposta)}</strong> : null}
            {ticket.respondidoEm ? (
              <CountdownLine $tone="success">
                <FiCheckCircle aria-hidden="true" />
                Respondido em {formatDateTime(ticket.respondidoEm)}
              </CountdownLine>
            ) : ticket.slaResposta ? (
              <CountdownLine>
                <FiClock aria-hidden="true" />
                <SlaCountdown
                  deadline={ticket.slaResposta}
                  start={ticket.dataCriacao}
                  paused={ticket.status === "paused" && Boolean(ticket.pauseSla)}
                  pausedSince={ticket.pausedStartedAt}
                  pausedTotalMs={(ticket.pausedTotalSeconds ?? 0) * 1000}
                  done={ticket.status === "done"}
                  doneLabel="Finalizado"
                />
              </CountdownLine>
            ) : null}
          </Metric>

          <Metric>
            <p>SLA Solução</p>
            {ticket.slaSolucao ? <strong>{formatDateTime(ticket.slaSolucao)}</strong> : null}
            {ticket.slaSolucao ? (
              <CountdownLine>
                <FiClock aria-hidden="true" />
                <SlaCountdown
                  deadline={ticket.slaSolucao}
                  start={ticket.dataCriacao}
                  paused={ticket.status === "paused" && Boolean(ticket.pauseSla)}
                  pausedSince={ticket.pausedStartedAt}
                  pausedTotalMs={(ticket.pausedTotalSeconds ?? 0) * 1000}
                  done={ticket.status === "done"}
                  doneLabel="Finalizado"
                />
              </CountdownLine>
            ) : null}
          </Metric>

          <SummaryChips>
            <SummaryChip $tone={getSlaToneColor(getSlaToneFromProgress(ticket.progressoSla))}>
              {getSlaChipLabel(getSlaToneFromProgress(ticket.progressoSla))}
            </SummaryChip>
            <SummaryChip $tone="#6366f1">{getPriorityChipLabel(ticket.prioridade)}</SummaryChip>
          </SummaryChips>

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
            <Select
              value={ticket.tipoTicketId ?? ""}
              onChange={(event) => onChange({ tipoTicketId: event.target.value || null })}
            >
              <option value="">Selecione...</option>
              {lookups.tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </Select>
          </FormLabel>

          <FormLabel>
            Categorias
            <Select
              value={ticket.categoriaId ?? ""}
              onChange={(event) => onChange({ categoriaId: event.target.value || null })}
            >
              <option value="">Selecione...</option>
              {categoriaOptions.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </Select>
          </FormLabel>

          <FormLabel>
            Mesa de Trabalho
            <Select
              value={ticket.mesaTrabalhoId ?? ""}
              onChange={(event) => onChange({ mesaTrabalhoId: event.target.value || null })}
            >
              <option value="">Selecione...</option>
              {lookups.mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.nome}
                </option>
              ))}
            </Select>
          </FormLabel>

          <FormLabel>
            Operador
            <Select
              value={ticket.operadorId ?? ""}
              onChange={(event) => onChange({ operadorId: event.target.value || null })}
            >
              <option value="">Selecione...</option>
              {lookups.operadores.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nome}
                </option>
              ))}
            </Select>
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
            <FiClock aria-hidden="true" /> Última atualização: {formatDateTime(ticket.dataAtualizacao ?? ticket.data)}
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
