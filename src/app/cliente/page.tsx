"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { portalStatusFilterOptions } from "@/lib/tickets/portal-status-taxonomy";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";

type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  portalStatus: {
    key: string;
    tone: "info" | "warning" | "success";
    label: string;
    timelineTitle: string;
    description: string;
    nextActionHint: string;
  } | null;
  priority: string;
  category: { id: string; name: string } | null;
  updatedAt: string;
};

type Category = { id: string; name: string; description: string };

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Toolbar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled(Input)`
  width: 260px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const StatusSelect = styled(Select)`
  width: 190px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const KpiGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const KpiLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const KpiValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const ListCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 680px;
  display: grid;
  grid-template-columns: 90px 1fr 160px 140px 140px;
  gap: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
`;

const Th = styled.div`
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
`;

const Subject = styled.div`
  font-weight: ${({ theme }) => theme.typography.weight.bold};
`;

const FormGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.tokens.color.status.warning};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
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
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const RowLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: contents;
  &:hover ${Td} {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

export default function CustomerDashboardPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: "", description: "", categoriaId: "", priority: "NONE" });
  const [createError, setCreateError] = useState("");

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    tickets.forEach((t) => byStatus.set(t.status, (byStatus.get(t.status) || 0) + 1));
    return {
      total: tickets.length,
      todo: byStatus.get("TODO") || 0,
      doing: byStatus.get("DOING") || 0,
      done: byStatus.get("DONE") || 0
    };
  }, [tickets]);

  const loadCategories = async () => {
    const res = await fetch("/api/customer/categories");
    const json = await res.json().catch(() => ({}));
    setCategories(Array.isArray(json.data) ? json.data : []);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status.trim()) params.set("status", status.trim());
      const res = await fetch(`/api/customer/tickets?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      setTickets(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadTickets();
  }, []);

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
    <Grid>
      <HeaderRow>
        <Title>Painel</Title>
        <Toolbar>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tickets" />
          <StatusSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {portalStatusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </StatusSelect>
          <Button type="button" variant="ghost" onClick={() => loadTickets()} disabled={loading}>
            Atualizar
          </Button>
          <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
            Novo ticket
          </Button>
        </Toolbar>
      </HeaderRow>

      <KpiGrid>
        <KpiCard>
          <KpiLabel>Total</KpiLabel>
          <KpiValue>{counts.total}</KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Abertos</KpiLabel>
          <KpiValue>{counts.todo}</KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Em atendimento</KpiLabel>
          <KpiValue>{counts.doing}</KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Concluídos</KpiLabel>
          <KpiValue>{counts.done}</KpiValue>
        </KpiCard>
      </KpiGrid>

      <ListCard>
        {loading ? (
          <LoadingState title="Carregando tickets" description="Estamos consultando suas solicitações." />
        ) : tickets.length === 0 ? (
          <EmptyState title="Nenhum ticket encontrado" description="Tente outro filtro ou crie um novo ticket." />
        ) : (
          <TableWrap>
            <Table>
              <Th>#</Th>
              <Th>Assunto</Th>
              <Th>Categoria</Th>
              <Th>Status</Th>
              <Th>Atualizado</Th>
              {tickets.map((t) => (
                <RowLink key={t.id} href={`/cliente/tickets/${t.id}`}>
                  <Td>{t.number}</Td>
                  <Td><Subject>{t.subject}</Subject></Td>
                  <Td>{t.category?.name || "-"}</Td>
                  <Td><Badge>{t.portalStatus?.label || "Status indisponível"}</Badge></Td>
                  <Td>{formatDate(t.updatedAt)}</Td>
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
            <FieldLabel htmlFor="customer-ticket-subject">Título</FieldLabel>
            <Input id="customer-ticket-subject" value={createForm.subject} onChange={(e) => setCreateForm((s) => ({ ...s, subject: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="customer-ticket-description">Descrição</FieldLabel>
            <Textarea
              id="customer-ticket-description"
              value={createForm.description}
              onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
              style={{ minHeight: 140 }}
            />
          </Field>
          <FormRow>
            <Field>
              <FieldLabel htmlFor="customer-ticket-category">Categoria</FieldLabel>
              <Select id="customer-ticket-category" value={createForm.categoriaId} onChange={(e) => setCreateForm((s) => ({ ...s, categoriaId: e.target.value }))}>
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-ticket-priority">Prioridade</FieldLabel>
              <Select id="customer-ticket-priority" value={createForm.priority} onChange={(e) => setCreateForm((s) => ({ ...s, priority: e.target.value }))}>
                <option value="NONE">Normal</option>
                <option value="MEDIUM">Média</option>
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
    </Grid>
  );
}
