"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/ui/FeedbackState";
import { useToast } from "@/context/ToastContext";
import { FiExternalLink, FiPlus, FiXCircle } from "@/components/icons";
import { ContratoStatusPill } from "./ContratoStatusPill";
import { ActionsCell, IconButton, Table, TableScroll, Td, Th } from "./table";
import { formatCurrencyBRL, formatDateBR, type ContratoStatus } from "./contract-constants";

interface ContratoResumo {
  id: string;
  numero: string;
  titulo: string;
  status: ContratoStatus;
  inicioVigencia: string;
  fimVigencia: string | null;
  valorMensal: string | number | null;
  slaRespostaHoras?: number | null;
  slaSolucaoHoras?: number | null;
  _count?: { termos: number };
}

interface ContratoDisponivel {
  id: string;
  numero: string;
  titulo: string;
  status: ContratoStatus;
  inicioVigencia: string;
  fimVigencia: string | null;
  valorMensal: string | number | null;
}

interface SolicitanteContratoPanelProps {
  solicitanteId: string;
  servicoBloqueado?: boolean;
  servicoBloqueadoMotivo?: string | null;
}

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const Summary = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const SummaryItem = styled.div`
  display: grid;
  gap: 0.15rem;
`;

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

const SummaryValue = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
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

const Hint = styled.small`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`;

/**
 * Bloco de contrato no cadastro do solicitante: vínculo, histórico e atalho
 * para a tela de gestão de contratos.
 */
export function SolicitanteContratoPanel({
  solicitanteId,
  servicoBloqueado,
  servicoBloqueadoMotivo
}: SolicitanteContratoPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [contratos, setContratos] = useState<ContratoResumo[]>([]);
  const [vigente, setVigente] = useState<ContratoResumo | null>(null);
  const [disponiveis, setDisponiveis] = useState<ContratoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitantes/${solicitanteId}/contratos`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar contratos");

      setContratos(Array.isArray(json?.data?.contratos) ? json.data.contratos : []);
      setVigente(json?.data?.vigente ?? null);
      setDisponiveis(Array.isArray(json?.data?.disponiveis) ? json.data.disponiveis : []);
    } catch (error: any) {
      showToast(error?.message || "Erro ao carregar contratos da empresa", "error");
      setContratos([]);
      setVigente(null);
      setDisponiveis([]);
    } finally {
      setLoading(false);
    }
  }, [solicitanteId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openLink = () => {
    setSelectedId("");
    setLinkOpen(true);
  };

  const handleVincular = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/solicitantes/${solicitanteId}/contratos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoId: selectedId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao vincular contrato");
      showToast("Contrato vinculado à empresa.", "success");
      setLinkOpen(false);
      await load();
    } catch (error: any) {
      showToast(error?.message || "Falha ao vincular contrato", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDesvincular = async (contrato: ContratoResumo) => {
    if (!confirm(`Desvincular o contrato "${contrato.numero}" desta empresa?`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/solicitantes/${solicitanteId}/contratos?contratoId=${encodeURIComponent(contrato.id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao desvincular contrato");
      showToast("Contrato desvinculado.", "success");
      await load();
    } catch (error: any) {
      showToast(error?.message || "Falha ao desvincular contrato", "error");
    } finally {
      setBusy(false);
    }
  };

  const disponiveisOrdenados = useMemo(
    () =>
      [...disponiveis].sort((a, b) => (a.numero > b.numero ? 1 : a.numero < b.numero ? -1 : 0)),
    [disponiveis]
  );

  return (
    <Card as="section">
      <Header>
        <div>
          <Title>Contrato</Title>
          <Subtitle>
            A empresa precisa de um contrato ativo para manter o serviço liberado.
          </Subtitle>
        </div>
        <Button variant="ghost" onClick={openLink} disabled={loading || busy}>
          <FiPlus aria-hidden="true" /> Vincular contrato
        </Button>
      </Header>

      {loading ? (
        <LoadingState title="Carregando contrato" description="Buscando os contratos da empresa." />
      ) : (
        <>
          {vigente ? (
            <Summary>
              <SummaryItem>
                <SummaryLabel>Situação</SummaryLabel>
                <SummaryValue>
                  <ContratoStatusPill status={vigente.status} />
                </SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Contrato vigente</SummaryLabel>
                <SummaryValue>{`${vigente.numero} · ${vigente.titulo}`}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Vigência</SummaryLabel>
                <SummaryValue>{`${formatDateBR(vigente.inicioVigencia)} — ${
                  vigente.fimVigencia ? formatDateBR(vigente.fimVigencia) : "indeterminada"
                }`}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Valor mensal</SummaryLabel>
                <SummaryValue>{formatCurrencyBRL(vigente.valorMensal)}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>SLA solução</SummaryLabel>
                <SummaryValue>{`${vigente.slaSolucaoHoras ?? "-"} h`}</SummaryValue>
              </SummaryItem>
            </Summary>
          ) : servicoBloqueado ? (
            <Summary>
              <Badge tone="warning">
                {servicoBloqueadoMotivo || "Serviço bloqueado até um contrato ativo"}
              </Badge>
            </Summary>
          ) : null}

          {contratos.length === 0 ? (
            <EmptyState
              title="Nenhum contrato vinculado"
              description="Vincule um contrato existente ou crie um novo na área de contratos."
            />
          ) : (
            <TableScroll>
              <Table $minWidth="720px">
                <thead>
                  <tr>
                    <Th>Número</Th>
                    <Th>Status</Th>
                    <Th>Vigência</Th>
                    <Th $align="right">Valor mensal</Th>
                    <Th $align="right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((contrato) => (
                    <tr key={contrato.id}>
                      <Td>{contrato.numero}</Td>
                      <Td>
                        <ContratoStatusPill status={contrato.status} />
                      </Td>
                      <Td>{`${formatDateBR(contrato.inicioVigencia)} — ${
                        contrato.fimVigencia ? formatDateBR(contrato.fimVigencia) : "indeterminada"
                      }`}</Td>
                      <Td $align="right">{formatCurrencyBRL(contrato.valorMensal)}</Td>
                      <Td $align="right">
                        <ActionsCell>
                          <IconButton
                            type="button"
                            $tone="info"
                            title="Abrir contrato"
                            aria-label={`Abrir contrato ${contrato.numero}`}
                            onClick={() => router.push(`/contratos/${contrato.id}`)}
                          >
                            <FiExternalLink aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            type="button"
                            $tone="danger"
                            title="Desvincular"
                            aria-label={`Desvincular contrato ${contrato.numero}`}
                            onClick={() => handleDesvincular(contrato)}
                            disabled={busy}
                          >
                            <FiXCircle aria-hidden="true" />
                          </IconButton>
                        </ActionsCell>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </>
      )}

      <Modal isOpen={linkOpen} onClose={() => setLinkOpen(false)} title="Vincular contrato">
        <Form>
          <FieldGroup>
            Contrato
            <Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Selecione...</option>
              {disponiveisOrdenados.map((contrato) => (
                <option key={contrato.id} value={contrato.id}>
                  {`${contrato.numero} · ${contrato.titulo}`}
                </option>
              ))}
            </Select>
            <Hint>
              Apenas contratos sem empresa vinculada ou em rascunho aparecem nesta lista. Vigências
              sobrepostas são bloqueadas.
            </Hint>
          </FieldGroup>
          {disponiveisOrdenados.length === 0 ? (
            <Hint>Nenhum contrato disponível. Crie um novo na área de contratos.</Hint>
          ) : null}
          <ModalActions>
            <Button variant="ghost" onClick={() => setLinkOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleVincular} disabled={busy || !selectedId}>
              {busy ? "Vinculando..." : "Vincular"}
            </Button>
          </ModalActions>
        </Form>
      </Modal>
    </Card>
  );
}
