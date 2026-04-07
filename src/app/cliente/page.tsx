"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  category: { id: string; name: string } | null;
  updatedAt: string;
};

type Category = { id: string; name: string; description: string };

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Toolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const Table = styled.div`
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tickets" style={{ width: 260 }} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}>
            <option value="">Todos</option>
            <option value="TODO">Aberto</option>
            <option value="DOING">Em atendimento</option>
            <option value="PAUSED">Pausado</option>
            <option value="DONE">Concluído</option>
          </Select>
          <Button type="button" variant="ghost" onClick={() => loadTickets()} disabled={loading}>
            Atualizar
          </Button>
          <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
            Novo ticket
          </Button>
        </Toolbar>
      </HeaderRow>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem" }}>
        <Card style={{ padding: "1rem" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.total}</div>
        </Card>
        <Card style={{ padding: "1rem" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Abertos</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.todo}</div>
        </Card>
        <Card style={{ padding: "1rem" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Em atendimento</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.doing}</div>
        </Card>
        <Card style={{ padding: "1rem" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Concluídos</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.done}</div>
        </Card>
      </div>

      <Card style={{ padding: "1rem" }}>
        {loading ? (
          <div style={{ padding: "1rem", opacity: 0.8 }}>Carregando...</div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: "1rem", opacity: 0.8 }}>Nenhum ticket encontrado.</div>
        ) : (
          <Table>
            <Th>#</Th>
            <Th>Assunto</Th>
            <Th>Categoria</Th>
            <Th>Status</Th>
            <Th>Atualizado</Th>
            {tickets.map((t) => (
              <RowLink key={t.id} href={`/cliente/tickets/${t.id}`}>
                <Td>{t.number}</Td>
                <Td style={{ fontWeight: 700 }}>{t.subject}</Td>
                <Td>{t.category?.name || "-"}</Td>
                <Td><Badge>{t.status}</Badge></Td>
                <Td>{formatDate(t.updatedAt)}</Td>
              </RowLink>
            ))}
          </Table>
        )}
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Novo ticket">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {createError ? <div style={{ color: "#DC2626", fontSize: 14 }}>{createError}</div> : null}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Título</div>
            <Input value={createForm.subject} onChange={(e) => setCreateForm((s) => ({ ...s, subject: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Descrição</div>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
              style={{ width: "100%", minHeight: 140, borderRadius: 12, border: "1px solid rgba(148,163,184,0.35)", padding: 12, background: "transparent", color: "inherit" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Categoria</div>
              <Select value={createForm.categoriaId} onChange={(e) => setCreateForm((s) => ({ ...s, categoriaId: e.target.value }))}>
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Prioridade</div>
              <Select value={createForm.priority} onChange={(e) => setCreateForm((s) => ({ ...s, priority: e.target.value }))}>
                <option value="NONE">Normal</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </Select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="button" variant="primary" onClick={() => submitNewTicket()}>Criar</Button>
          </div>
        </div>
      </Modal>
    </Grid>
  );
}
