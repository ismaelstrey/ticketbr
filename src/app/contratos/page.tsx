"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { PageContainer, PageHeader, PageSubtitle, PageTitle } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/FeedbackState";
import { FiEdit2, FiEye, FiPlus, FiSearch, FiTrash2 } from "@/components/icons";
import { useToast } from "@/context/ToastContext";
import { ContratoStatusPill } from "@/components/contracts/ContratoStatusPill";
import { ActionsCell, IconButton, Table, TableScroll, Td, Th } from "@/components/contracts/table";
import {
  contratoStatusLabels,
  formatCurrencyBRL,
  formatDateBR,
  type ContratoStatus
} from "@/components/contracts/contract-constants";

interface ContratoListItem {
  id: string;
  numero: string;
  titulo: string;
  status: ContratoStatus;
  inicioVigencia: string;
  fimVigencia: string | null;
  valorMensal: string | number | null;
  solicitante: { id: string; nome_fantasia: string; razao_social: string } | null;
  _count?: { termos: number; tickets: number };
}

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.tokens.color.text.muted};
    pointer-events: none;
  }

  input {
    padding-left: 2.2rem;
    width: 100%;
  }
`;

const TableCard = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[3]};
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const MetaText = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const TitleCell = styled.div`
  display: grid;
  gap: 0.15rem;
`;

const TitleStrong = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

function describeVigencia(inicio: string, fim: string | null): string {
  return `${formatDateBR(inicio)} — ${fim ? formatDateBR(fim) : "indeterminada"}`;
}

export default function ContratosPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [items, setItems] = useState<ContratoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ContratoStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (status) params.set("status", status);

      const res = await fetch(`/api/contratos?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar contratos");

      setItems(Array.isArray(json?.data) ? json.data : []);
      setTotal(typeof json?.meta?.total === "number" ? json.meta.total : 0);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar contratos");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, status]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRemove = async (item: ContratoListItem) => {
    if (!confirm(`Excluir o contrato "${item.numero} - ${item.titulo}"?`)) return;
    setActionId(item.id);
    try {
      const res = await fetch(`/api/contratos/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir contrato");
      showToast("Contrato excluído.", "success");
      await fetchData();
    } catch (err: any) {
      showToast(err?.message || "Falha ao excluir contrato", "error");
    } finally {
      setActionId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderRow>
          <div>
            <PageTitle>Contratos</PageTitle>
            <PageSubtitle>Gestão de vigências, valores e termos de SLA por empresa.</PageSubtitle>
          </div>
          <Button variant="primary" onClick={() => router.push("/contratos/novo")}>
            <FiPlus aria-hidden="true" /> Novo contrato
          </Button>
        </HeaderRow>
      </PageHeader>

      <Toolbar>
        <SearchWrap>
          <FiSearch aria-hidden="true" />
          <Input
            aria-label="Buscar contratos"
            placeholder="Buscar por número, título ou empresa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </SearchWrap>
        <Select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as ContratoStatus | "");
          }}
        >
          <option value="">Todos os status</option>
          {(Object.keys(contratoStatusLabels) as ContratoStatus[]).map((key) => (
            <option key={key} value={key}>
              {contratoStatusLabels[key]}
            </option>
          ))}
        </Select>
      </Toolbar>

      {loading ? (
        <LoadingState title="Carregando contratos" description="Buscando os contratos cadastrados." />
      ) : error ? (
        <ErrorState description={error} onAction={fetchData} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum contrato encontrado"
          description="Ajuste os filtros ou crie um novo contrato."
        />
      ) : (
        <TableCard as="section">
          <TableScroll>
            <Table $minWidth="900px" role="table">
              <thead>
                <tr>
                  <Th>Número</Th>
                  <Th>Contrato</Th>
                  <Th>Empresa</Th>
                  <Th>Status</Th>
                  <Th>Vigência</Th>
                  <Th $align="right">Valor mensal</Th>
                  <Th $align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <TitleStrong>{item.numero}</TitleStrong>
                    </Td>
                    <Td>
                      <TitleCell>
                        <TitleStrong>{item.titulo}</TitleStrong>
                        <MetaText>
                          {item._count?.termos ?? 0} termo(s) · {item._count?.tickets ?? 0} ticket(s)
                        </MetaText>
                      </TitleCell>
                    </Td>
                    <Td>{item.solicitante?.nome_fantasia || item.solicitante?.razao_social || "-"}</Td>
                    <Td>
                      <ContratoStatusPill status={item.status} />
                    </Td>
                    <Td>{describeVigencia(item.inicioVigencia, item.fimVigencia)}</Td>
                    <Td $align="right">{formatCurrencyBRL(item.valorMensal)}</Td>
                    <Td $align="right">
                      <ActionsCell>
                        <IconButton
                          type="button"
                          $tone="info"
                          title="Ver detalhes"
                          aria-label={`Ver detalhes do contrato ${item.numero}`}
                          onClick={() => router.push(`/contratos/${item.id}`)}
                        >
                          <FiEye aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          title="Editar"
                          aria-label={`Editar contrato ${item.numero}`}
                          onClick={() => router.push(`/contratos/${item.id}?editar=1`)}
                        >
                          <FiEdit2 aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          $tone="danger"
                          title="Excluir"
                          aria-label={`Excluir contrato ${item.numero}`}
                          onClick={() => handleRemove(item)}
                          disabled={actionId === item.id}
                        >
                          <FiTrash2 aria-hidden="true" />
                        </IconButton>
                      </ActionsCell>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>

          <Footer>
            <MetaText>{`${total} registro(s)`}</MetaText>
            <Pager>
              <MetaText as="span">Por página</MetaText>
              <Select
                aria-label="Itens por página"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
              <Button
                variant="ghost"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <MetaText as="span">{`${page} / ${totalPages}`}</MetaText>
              <Button
                variant="ghost"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </Pager>
          </Footer>
        </TableCard>
      )}
    </PageContainer>
  );
}
