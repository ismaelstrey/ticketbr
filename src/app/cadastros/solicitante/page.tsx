"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SolicitanteForm } from "@/components/forms/SolicitanteForm";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { useToast } from "@/context/ToastContext";

const Page = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
`;

const RightActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const SearchWrap = styled.div`
  position: relative;
  width: min(340px, 100%);

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }

  input {
    padding-left: 2.2rem;
    width: 100%;
  }
`;

const TableWrap = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const TableScroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
`;

const Th = styled.th`
  background: #f9fafb;
  color: #4b5563;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const ThButton = styled.button`
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 2.5rem 1.25rem;
  text-align: center;
  color: #6b7280;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.9rem 1rem;
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Select = styled.select`
  border: 1px solid #d8dbe3;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  font: inherit;
  background: #fff;
`;

const Message = styled.div<{ $type: "success" | "error" }>`
  border: 1px solid ${({ $type }) => ($type === "success" ? "#bbf7d0" : "#fecaca")};
  background: ${({ $type }) => ($type === "success" ? "#f0fdf4" : "#fef2f2")};
  color: ${({ $type }) => ($type === "success" ? "#166534" : "#991b1b")};
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
`;

type SortBy = "nome_fantasia" | "cnpj" | "email" | "telefone" | "data_cadastro";
type SortDir = "asc" | "desc";

export default function SolicitantePage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortBy>("data_cadastro");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        sortBy,
        sortDir,
      });
      const res = await fetch(`/api/solicitantes?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Falha ao carregar solicitantes");
      }
      setData(Array.isArray(json.data) ? json.data : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao carregar dados" });
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleSort = (next: SortBy) => {
    if (sortBy === next) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(next);
    setSortDir("asc");
  };

  const handleNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Excluir solicitante "${item.nome_fantasia}"?`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/solicitantes/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir solicitante");
      setMessage({ type: "success", text: "Solicitante excluído com sucesso." });
      showToast("Solicitante excluído com sucesso.", "success");
      await fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao excluir solicitante" });
      showToast(err.message || "Falha ao excluir solicitante", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload: any) => {
    setLoading(true);
    setMessage(null);
    try {
      const url = editingItem ? `/api/solicitantes/${editingItem.id}` : "/api/solicitantes";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar solicitante");
      setMessage({ type: "success", text: editingItem ? "Solicitante atualizado com sucesso." : "Solicitante cadastrado com sucesso." });
      showToast(editingItem ? "Solicitante atualizado com sucesso." : "Solicitante cadastrado com sucesso.", "success");
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao salvar solicitante" });
      showToast(err.message || "Falha ao salvar solicitante", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Header>
        <Title>Solicitantes</Title>
        <RightActions>
          <SearchWrap>
            <FiSearch aria-hidden="true" />
            <Input
              aria-label="Buscar solicitantes"
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchWrap>
          <Button variant="primary" onClick={handleNew} disabled={loading}>
            <FiPlus /> Novo Solicitante
          </Button>
        </RightActions>
      </Header>

      {message && <Message $type={message.type}>{message.text}</Message>}

      <TableWrap>
        <TableScroll>
          <Table role="table" aria-busy={loading}>
            <thead>
              <tr>
                <Th>
                  <ThButton type="button" onClick={() => toggleSort("nome_fantasia")} aria-label="Ordenar por nome">
                    Nome {sortBy === "nome_fantasia" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </ThButton>
                </Th>
                <Th>
                  <ThButton type="button" onClick={() => toggleSort("cnpj")} aria-label="Ordenar por CPF/CNPJ">
                    CPF/CNPJ {sortBy === "cnpj" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </ThButton>
                </Th>
                <Th>
                  <ThButton type="button" onClick={() => toggleSort("email")} aria-label="Ordenar por e-mail">
                    E-mail {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </ThButton>
                </Th>
                <Th>
                  <ThButton type="button" onClick={() => toggleSort("telefone")} aria-label="Ordenar por telefone">
                    Telefone {sortBy === "telefone" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </ThButton>
                </Th>
                <Th>
                  <ThButton type="button" onClick={() => toggleSort("data_cadastro")} aria-label="Ordenar por data de cadastro">
                    Cadastro {sortBy === "data_cadastro" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </ThButton>
                </Th>
                <Th style={{ textAlign: "right" }}>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty>Nenhum solicitante cadastrado.</Empty>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.nome_fantasia}</Td>
                    <Td>{item.cnpj}</Td>
                    <Td>{item.email}</Td>
                    <Td>{item.telefone}</Td>
                    <Td>{new Date(item.data_cadastro).toLocaleDateString("pt-BR")}</Td>
                    <Td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          aria-label={`Editar ${item.nome_fantasia}`}
                          onClick={() => handleEdit(item)}
                          disabled={loading}
                          style={{
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            borderRadius: 8,
                            padding: "0.35rem 0.5rem",
                            cursor: "pointer",
                          }}
                        >
                          <FiEdit2 aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${item.nome_fantasia}`}
                          onClick={() => handleDelete(item)}
                          disabled={loading}
                          style={{
                            border: "1px solid #fecaca",
                            background: "#fff",
                            color: "#ef4444",
                            borderRadius: 8,
                            padding: "0.35rem 0.5rem",
                            cursor: "pointer",
                          }}
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableScroll>

        <Footer>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            {loading ? "Carregando..." : `${total} registros`}
          </div>
          <Pager>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Por página</span>
            <Select
              aria-label="Itens por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </Select>
            <Button
              variant="ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
            >
              Anterior
            </Button>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
            >
              Próxima
            </Button>
          </Pager>
        </Footer>
      </TableWrap>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Solicitante" : "Novo Solicitante"}
      >
        <SolicitanteForm
          initialData={editingItem}
          onCancel={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </Modal>
    </Page>
  );
}
