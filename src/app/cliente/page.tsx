"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { CustomerSlaSummary } from "@/types/customerDashboard";

type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  portalStatus: { label: string; tone: "info" | "warning" | "success" } | null;
  priority: string;
  sla: CustomerSlaSummary;
  category: { id: string; name: string } | null;
  responseSlaAt: string | null;
  solutionSlaAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Category = { id: string; name: string; description: string };

const PageGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const TitleBlock = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Title = styled.h1`
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) repeat(4, minmax(130px, 1fr)) auto auto;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const KpiGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(Card)<{ $tone?: "warning" | "info" | "success" }>`
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
  border-color: ${({ theme, $tone }) =>
    $tone === "warning"
      ? theme.tokens.color.status.warningBorder
      : $tone === "success"
        ? theme.tokens.color.status.successBorder
        : $tone === "info"
          ? theme.tokens.color.status.infoBorder
          : theme.tokens.color.border.default};
`;

const KpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const KpiValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ListCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 980px;
  display: grid;
  grid-template-columns: 86px 1.4fr 150px 140px 130px 170px 170px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  overflow: hidden;
`;

const Th = styled.div`
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.div`
  min-width: 0;
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
`;

const Subject = styled.div`
  min-width: 0;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: contents;

  &:hover ${Td} {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const SlaWrap = styled.div`
  display: grid;
  gap: 0.3rem;
  width: 100%;
`;

const SlaBar = styled.div`
  height: 0.45rem;
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

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FormGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
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

export default function CustomerDashboardPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [preset, setPreset] = useState("7d");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: "", description: "", categoriaId: "", priority: "NONE" });
  const [createError, setCreateError] = useState("");

  const counts = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status !== "DONE").length,
      doing: tickets.filter((ticket) => ticket.status === "DOING").length,
      done: tickets.filter((ticket) => ticket.status === "DONE").length,
      attention: tickets.filter((ticket) => ticket.sla?.state === "OVERDUE" || ticket.sla?.state === "AT_RISK").length
    };
  }, [tickets]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/customer/categories");
    const json = await res.json().catch(() => ({}));
    setCategories(Array.isArray(json.data) ? json.data : []);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("categoryId", categoryId);
      if (preset) params.set("preset", preset);
      const res = await fetch(`/api/customer/tickets?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      setTickets(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [categoryId, preset, priority, q, status]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submitNewTicket = async () => {
    setCreateError("");
    const res = await fetch("/api/customer/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCreateError(String(json?.error || "Falha ao criar ticket"));
      return;
    }
    setCreateOpen(false);
    setCreateForm({ subject: "", description: "", categoriaId: "", priority: "NONE" });
    await loadTickets();
  };

  return (
    <PageGrid>
      <HeaderRow>
        <TitleBlock>
          <Title>Solicitacoes</Title>
          <Subtitle>Acompanhe chamados, prazos de SLA e atualizacoes da sua empresa.</Subtitle>
        </TitleBlock>
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          Novo ticket
        </Button>
      </HeaderRow>

      <KpiGrid>
        <KpiCard>
          <KpiLabel>Total filtrado</KpiLabel>
          <KpiValue>{counts.total}</KpiValue>
        </KpiCard>
        <KpiCard $tone="info">
          <KpiLabel>Abertos</KpiLabel>
          <KpiValue>{counts.open}</KpiValue>
        </KpiCard>
        <KpiCard $tone="info">
          <KpiLabel>Em atendimento</KpiLabel>
          <KpiValue>{counts.doing}</KpiValue>
        </KpiCard>
        <KpiCard $tone="success">
          <KpiLabel>Concluidos</KpiLabel>
          <KpiValue>{counts.done}</KpiValue>
        </KpiCard>
        <KpiCard $tone={counts.attention ? "warning" : "success"}>
          <KpiLabel>SLA em atencao</KpiLabel>
          <KpiValue>{counts.attention}</KpiValue>
        </KpiCard>
      </KpiGrid>

      <Toolbar>
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por assunto ou descricao" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="TODO">Aberto</option>
          <option value="DOING">Em atendimento</option>
          <option value="PAUSED">Pausado</option>
          <option value="DONE">Concluido</option>
        </Select>
        <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">Todas prioridades</option>
          <option value="NONE">Normal</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </Select>
        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Todas categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </Select>
        <Select value={preset} onChange={(event) => setPreset(event.target.value)}>
          <option value="">Todo periodo</option>
          <option value="today">Hoje</option>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
        </Select>
        <Button type="button" variant="ghost" onClick={() => loadTickets()} disabled={loading}>
          Atualizar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQ("");
            setStatus("");
            setPriority("");
            setCategoryId("");
            setPreset("7d");
          }}
        >
          Limpar
        </Button>
      </Toolbar>

      <ListCard>
        {loading ? (
          <LoadingState title="Carregando tickets" description="Estamos consultando suas solicitacoes." />
        ) : tickets.length === 0 ? (
          <EmptyState title="Nenhum ticket encontrado" description="Tente outro filtro ou crie um novo ticket." />
        ) : (
          <TableWrap>
            <Table>
              <Th>#</Th>
              <Th>Assunto</Th>
              <Th>Categoria</Th>
              <Th>Status</Th>
              <Th>Prioridade</Th>
              <Th>SLA</Th>
              <Th>Atualizado</Th>
              {tickets.map((ticket) => (
                <RowLink key={ticket.id} href={`/cliente/tickets/${ticket.id}`}>
                  <Td>{ticket.number}</Td>
                  <Td><Subject>{ticket.subject}</Subject></Td>
                  <Td><Muted>{ticket.category?.name || "-"}</Muted></Td>
                  <Td><Badge tone={ticket.portalStatus?.tone || "neutral"}>{ticket.portalStatus?.label || ticket.status}</Badge></Td>
                  <Td><Badge>{priorityLabel(ticket.priority)}</Badge></Td>
                  <Td>
                    <SlaWrap>
                      <Badge tone={slaTone(ticket.sla?.state)}>{ticket.sla?.label || "Sem SLA"}</Badge>
                      {typeof ticket.sla?.progress === "number" ? (
                        <SlaBar aria-label={`SLA ${ticket.sla.progress}%`}>
                          <SlaFill $value={ticket.sla.progress} $state={ticket.sla.state} />
                        </SlaBar>
                      ) : null}
                      <Muted>{formatDate(ticket.solutionSlaAt)}</Muted>
                    </SlaWrap>
                  </Td>
                  <Td>{formatDate(ticket.updatedAt)}</Td>
                </RowLink>
              ))}
            </Table>
          </TableWrap>
        )}
      </ListCard>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Novo ticket">
        <FormGrid>
          {createError ? <ErrorText role="alert">{createError}</ErrorText> : null}
          <Field>
            <FieldLabel htmlFor="customer-ticket-subject">Titulo</FieldLabel>
            <Input id="customer-ticket-subject" value={createForm.subject} onChange={(event) => setCreateForm((state) => ({ ...state, subject: event.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="customer-ticket-description">Descricao</FieldLabel>
            <Textarea
              id="customer-ticket-description"
              value={createForm.description}
              onChange={(event) => setCreateForm((state) => ({ ...state, description: event.target.value }))}
              style={{ minHeight: 140 }}
            />
          </Field>
          <FormRow>
            <Field>
              <FieldLabel htmlFor="customer-ticket-category">Categoria</FieldLabel>
              <Select id="customer-ticket-category" value={createForm.categoriaId} onChange={(event) => setCreateForm((state) => ({ ...state, categoriaId: event.target.value }))}>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-ticket-priority">Prioridade</FieldLabel>
              <Select id="customer-ticket-priority" value={createForm.priority} onChange={(event) => setCreateForm((state) => ({ ...state, priority: event.target.value }))}>
                <option value="NONE">Normal</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </Select>
            </Field>
          </FormRow>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="button" variant="primary" onClick={() => submitNewTicket()}>Criar</Button>
          </FormActions>
        </FormGrid>
      </Modal>
    </PageGrid>
  );
}
