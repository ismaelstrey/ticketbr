"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { FiEdit2, FiPlus, FiTrash2 } from "@/components/icons";
import { useToast } from "@/context/ToastContext";
import { ActionsCell, IconButton, Table, TableScroll, Td, Th } from "./table";
import {
  slaTermScopeLabels,
  ticketPriorityLabels,
  type SlaTermScope,
  type TicketPriorityKey
} from "./contract-constants";

interface TipoOption {
  id: string;
  nome: string;
}

interface CategoriaOption {
  id: string;
  nome: string;
  tipo_ticket_id: string;
}

interface Termo {
  id: string;
  escopo: SlaTermScope;
  tipoTicketId: string | null;
  categoriaId: string | null;
  prioridade: TicketPriorityKey | null;
  slaRespostaHoras: number | null;
  slaSolucaoHoras: number;
  ativo: boolean;
  tipoTicket?: { id: string; nome: string } | null;
  categoria?: { id: string; nome: string } | null;
}

interface TermosSlaPanelProps {
  contratoId: string;
  readOnly?: boolean;
}

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FieldGroup = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SCOPE_ORDER: SlaTermScope[] = ["TIPO_TICKET", "CATEGORIA", "PRIORIDADE", "GLOBAL"];

/** Descrição legível do alvo do termo (tipo, categoria, prioridade ou global). */
function describeTarget(termo: Termo): string {
  switch (termo.escopo) {
    case "TIPO_TICKET":
      return termo.tipoTicket?.nome ?? "Tipo removido";
    case "CATEGORIA":
      return termo.categoria?.nome ?? "Categoria removida";
    case "PRIORIDADE":
      return termo.prioridade ? ticketPriorityLabels[termo.prioridade] : "-";
    default:
      return "Qualquer ticket";
  }
}

/**
 * Painel de termos de SLA do contrato.
 * A ordem de precedência é: tipo de ticket → categoria → prioridade → global.
 */
export function TermosSlaPanel({ contratoId, readOnly = false }: TermosSlaPanelProps) {
  const { showToast } = useToast();
  const [termos, setTermos] = useState<Termo[]>([]);
  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [escopo, setEscopo] = useState<SlaTermScope>("GLOBAL");
  const [tipoTicketId, setTipoTicketId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [prioridade, setPrioridade] = useState<TicketPriorityKey>("HIGH");
  const [slaRespostaHoras, setSlaRespostaHoras] = useState("");
  const [slaSolucaoHoras, setSlaSolucaoHoras] = useState("");

  const loadTermos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/termos-sla`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar termos");
      setTermos(Array.isArray(json?.data) ? json.data : []);
    } catch (error: any) {
      showToast(error?.message || "Erro ao carregar termos de SLA", "error");
      setTermos([]);
    } finally {
      setLoading(false);
    }
  }, [contratoId, showToast]);

  useEffect(() => {
    void loadTermos();
  }, [loadTermos]);

  useEffect(() => {
    fetch("/api/tickets/lookups")
      .then((res) => (res.ok ? res.json() : { data: {} }))
      .then((json) => {
        setTipos(Array.isArray(json?.data?.tipos) ? json.data.tipos : []);
        setCategorias(Array.isArray(json?.data?.categorias) ? json.data.categorias : []);
      })
      .catch(() => {
        setTipos([]);
        setCategorias([]);
      });
  }, []);

  const sortedTermos = useMemo(
    () => [...termos].sort((a, b) => SCOPE_ORDER.indexOf(a.escopo) - SCOPE_ORDER.indexOf(b.escopo)),
    [termos]
  );

  const resetForm = () => {
    setEditingId(null);
    setEscopo("GLOBAL");
    setTipoTicketId("");
    setCategoriaId("");
    setPrioridade("HIGH");
    setSlaRespostaHoras("");
    setSlaSolucaoHoras("");
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (termo: Termo) => {
    setEditingId(termo.id);
    setEscopo(termo.escopo);
    setTipoTicketId(termo.tipoTicketId ?? "");
    setCategoriaId(termo.categoriaId ?? "");
    setPrioridade(termo.prioridade ?? "HIGH");
    setSlaRespostaHoras(termo.slaRespostaHoras != null ? String(termo.slaRespostaHoras) : "");
    setSlaSolucaoHoras(String(termo.slaSolucaoHoras));
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const horas = Number(slaSolucaoHoras);
    if (!Number.isFinite(horas) || horas <= 0) {
      showToast("Informe as horas de solução do termo.", "error");
      return;
    }
    if (escopo === "TIPO_TICKET" && !tipoTicketId) {
      showToast("Selecione o tipo de ticket.", "error");
      return;
    }
    if (escopo === "CATEGORIA" && !categoriaId) {
      showToast("Selecione a categoria.", "error");
      return;
    }

    const resposta = Number(slaRespostaHoras);
    const payload = {
      escopo,
      tipoTicketId: escopo === "TIPO_TICKET" ? tipoTicketId : null,
      categoriaId: escopo === "CATEGORIA" ? categoriaId : null,
      prioridade: escopo === "PRIORIDADE" ? prioridade : null,
      slaRespostaHoras: Number.isFinite(resposta) && resposta > 0 ? resposta : null,
      slaSolucaoHoras: horas
    };

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/contratos/${contratoId}/termos-sla/${editingId}`
        : `/api/contratos/${contratoId}/termos-sla`;
      const res = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar termo");

      showToast(editingId ? "Termo atualizado." : "Termo adicionado.", "success");
      setIsModalOpen(false);
      resetForm();
      await loadTermos();
    } catch (error: any) {
      showToast(error?.message || "Erro ao salvar termo", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (termo: Termo) => {
    if (!confirm(`Desativar o termo "${describeTarget(termo)}"?`)) return;
    try {
      const res = await fetch(`/api/contratos/${contratoId}/termos-sla/${termo.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao remover termo");
      showToast("Termo desativado.", "success");
      await loadTermos();
    } catch (error: any) {
      showToast(error?.message || "Erro ao remover termo", "error");
    }
  };

  const categoriasFiltradas = useMemo(
    () => (tipoTicketId ? categorias.filter((c) => c.tipo_ticket_id === tipoTicketId) : categorias),
    [categorias, tipoTicketId]
  );

  return (
    <Card as="section">
      <Header>
        <div>
          <Title>Termos de SLA</Title>
          <Subtitle>
            Precedência: tipo de ticket, categoria, prioridade e, por último, global.
          </Subtitle>
        </div>
        {!readOnly ? (
          <Button variant="primary" onClick={openCreate} disabled={loading}>
            <FiPlus /> Adicionar termo
          </Button>
        ) : null}
      </Header>

      {loading ? (
        <LoadingState title="Carregando termos" description="Buscando os termos de SLA do contrato." />
      ) : sortedTermos.length === 0 ? (
        <EmptyState
          title="Nenhum termo cadastrado"
          description="O contrato usará as horas de SLA do próprio contrato ou a política global."
        />
      ) : (
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <Th>Escopo</Th>
                <Th>Alvo</Th>
                <Th>Resposta (h)</Th>
                <Th>Solução (h)</Th>
                <Th>Situação</Th>
                {!readOnly ? <Th>Ações</Th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedTermos.map((termo) => (
                <tr key={termo.id}>
                  <Td>{slaTermScopeLabels[termo.escopo]}</Td>
                  <Td>{describeTarget(termo)}</Td>
                  <Td>{termo.slaRespostaHoras ?? "-"}</Td>
                  <Td>{termo.slaSolucaoHoras}</Td>
                  <Td>
                    <Badge tone={termo.ativo ? "success" : "neutral"}>
                      {termo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </Td>
                  {!readOnly ? (
                    <Td>
                      <ActionsCell>
                        <IconButton
                          type="button"
                          onClick={() => openEdit(termo)}
                          aria-label={`Editar termo ${describeTarget(termo)}`}
                          title="Editar"
                        >
                          <FiEdit2 aria-hidden="true" />
                        </IconButton>
                        {termo.ativo ? (
                          <IconButton
                            type="button"
                            onClick={() => handleRemove(termo)}
                            aria-label={`Desativar termo ${describeTarget(termo)}`}
                            title="Desativar"
                          >
                            <FiTrash2 aria-hidden="true" />
                          </IconButton>
                        ) : null}
                      </ActionsCell>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? "Editar termo de SLA" : "Novo termo de SLA"}
      >
        <Form>
          <FieldGroup>
            Escopo
            <Select value={escopo} onChange={(event) => setEscopo(event.target.value as SlaTermScope)}>
              {SCOPE_ORDER.map((scope) => (
                <option key={scope} value={scope}>
                  {slaTermScopeLabels[scope]}
                </option>
              ))}
            </Select>
          </FieldGroup>

          {escopo === "TIPO_TICKET" ? (
            <FieldGroup>
              Tipo de ticket
              <Select value={tipoTicketId} onChange={(event) => setTipoTicketId(event.target.value)}>
                <option value="">Selecione...</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          ) : null}

          {escopo === "CATEGORIA" ? (
            <>
              <FieldGroup>
                Tipo de ticket (filtro)
                <Select
                  value={tipoTicketId}
                  onChange={(event) => {
                    setTipoTicketId(event.target.value);
                    setCategoriaId("");
                  }}
                >
                  <option value="">Todos</option>
                  {tipos.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup>
                Categoria
                <Select value={categoriaId} onChange={(event) => setCategoriaId(event.target.value)}>
                  <option value="">Selecione...</option>
                  {categoriasFiltradas.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </>
          ) : null}

          {escopo === "PRIORIDADE" ? (
            <FieldGroup>
              Prioridade
              <Select
                value={prioridade}
                onChange={(event) => setPrioridade(event.target.value as TicketPriorityKey)}
              >
                {(Object.keys(ticketPriorityLabels) as TicketPriorityKey[]).map((key) => (
                  <option key={key} value={key}>
                    {ticketPriorityLabels[key]}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          ) : null}

          <FieldGroup>
            SLA de resposta (h)
            <Input
              inputMode="numeric"
              value={slaRespostaHoras}
              placeholder="2"
              onChange={(event) => setSlaRespostaHoras(event.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            SLA de solução (h)
            <Input
              required
              inputMode="numeric"
              value={slaSolucaoHoras}
              placeholder="8"
              onChange={(event) => setSlaSolucaoHoras(event.target.value)}
            />
          </FieldGroup>

          <ModalActions>
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar termo"}
            </Button>
          </ModalActions>
        </Form>
      </Modal>
    </Card>
  );
}
