"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { PageContainer, PageSubtitle, PageTitle } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/FeedbackState";
import { useToast } from "@/context/ToastContext";
import {
  FiArrowLeft,
  FiEdit2,
  FiPauseCircle,
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiXCircle
} from "@/components/icons";
import { ContratoForm, type ContratoFormPayload } from "@/components/contracts/ContratoForm";
import { ContratoStatusPill } from "@/components/contracts/ContratoStatusPill";
import { TermosSlaPanel } from "@/components/contracts/TermosSlaPanel";
import {
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  toDateInputValue,
  type ContratoStatus
} from "@/components/contracts/contract-constants";

interface ContratoDetalhe {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  status: ContratoStatus;
  inicioVigencia: string;
  fimVigencia: string | null;
  valorMensal: string | number | null;
  slaRespostaHoras: number | null;
  slaSolucaoHoras: number | null;
  renovacaoAutomatica: boolean;
  observacoes: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  solicitante: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
    status: boolean;
    servico_bloqueado: boolean;
    servico_bloqueado_motivo: string | null;
  } | null;
  slaPolicy: { id: string; nome: string } | null;
  renovadoDe: { id: string; numero: string; titulo: string } | null;
  renovacoes: { id: string; numero: string; status: ContratoStatus; inicioVigencia: string }[];
  _count: { termos: number; tickets: number };
  historico: { id: string; action: string; createdAt: string; actorUserId: string | null }[];
}

interface RenovarForm {
  numero: string;
  inicioVigencia: string;
  fimVigencia: string;
  valorMensal: string;
  observacoes: string;
}

const auditActionLabels: Record<string, string> = {
  CREATE: "Contrato criado",
  UPDATE: "Contrato atualizado",
  VINCULAR: "Vínculo de empresa alterado",
  ATIVAR: "Contrato ativado",
  SUSPENDER: "Contrato suspenso",
  CANCELAR: "Contrato cancelado",
  RENOVAR: "Contrato renovado",
  DELETE: "Contrato excluído",
  TERMO_CREATE: "Termo de SLA criado",
  TERMO_UPDATE: "Termo de SLA atualizado",
  TERMO_DELETE: "Termo de SLA desativado"
};

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const ActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Field = styled.div`
  display: grid;
  gap: 0.15rem;
`;

const FieldLabel = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const FieldValue = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  word-break: break-word;
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const Timeline = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TimelineItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const TimelineWhen = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.xs};
  white-space: nowrap;
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

const Hint = styled.small`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

export default function ContratoDetalhePage() {
  const params = useParams<{ id: string }>();
  const contratoId = params?.id;
  const router = useRouter();
  const { showToast } = useToast();

  const [contrato, setContrato] = useState<ContratoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [renovarOpen, setRenovarOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [renovarForm, setRenovarForm] = useState<RenovarForm>({
    numero: "",
    inicioVigencia: "",
    fimVigencia: "",
    valorMensal: "",
    observacoes: ""
  });

  const load = useCallback(async () => {
    if (!contratoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contratos/${contratoId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar contrato");
      setContrato(json.data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar contrato");
      setContrato(null);
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Atalho `?editar=1` vindo da listagem
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("editar") === "1") {
      setEditOpen(true);
    }
  }, []);

  const openRenovar = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    setRenovarForm({
      numero: "",
      inicioVigencia: contrato?.fimVigencia && contrato.fimVigencia > new Date().toISOString()
        ? toDateInputValue(contrato.fimVigencia)
        : hoje,
      fimVigencia: "",
      valorMensal: contrato?.valorMensal != null ? String(contrato.valorMensal) : "",
      observacoes: ""
    });
    setRenovarOpen(true);
  };

  const runAction = async (
    path: string,
    body: Record<string, unknown> | undefined,
    successMessage: string
  ) => {
    if (!contratoId) return null;
    setBusy(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {})
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha na operação");
      showToast(successMessage, "success");
      await load();
      return json.data;
    } catch (err: any) {
      showToast(err?.message || "Falha na operação", "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (payload: ContratoFormPayload) => {
    if (!contratoId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar contrato");
      showToast("Contrato atualizado.", "success");
      setEditOpen(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || "Falha ao salvar contrato", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelar = async () => {
    const novo = await runAction("/cancelar", { motivo: cancelMotivo.trim() }, "Contrato cancelado.");
    if (novo) {
      setCancelOpen(false);
      setCancelMotivo("");
    }
  };

  const handleRenovar = async () => {
    const novo = await runAction(
      "/renovar",
      {
        ...(renovarForm.numero.trim() ? { numero: renovarForm.numero.trim() } : {}),
        ...(renovarForm.inicioVigencia ? { inicioVigencia: renovarForm.inicioVigencia } : {}),
        ...(renovarForm.fimVigencia ? { fimVigencia: renovarForm.fimVigencia } : {}),
        ...(renovarForm.valorMensal.trim() ? { valorMensal: renovarForm.valorMensal } : {}),
        ...(renovarForm.observacoes.trim() ? { observacoes: renovarForm.observacoes.trim() } : {})
      },
      "Contrato renovado."
    );
    if (novo?.id) {
      setRenovarOpen(false);
      router.push(`/contratos/${novo.id}`);
    }
  };

  const handleExcluir = async () => {
    if (!contratoId || !contrato) return;
    if (!confirm(`Excluir o contrato "${contrato.numero}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir contrato");
      showToast("Contrato excluído.", "success");
      router.push("/contratos");
    } catch (err: any) {
      showToast(err?.message || "Falha ao excluir contrato", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState title="Carregando contrato" description="Buscando os dados do contrato." />
      </PageContainer>
    );
  }

  if (error || !contrato) {
    return (
      <PageContainer>
        <ErrorState description={error ?? "Contrato não encontrado."} onAction={load} />
      </PageContainer>
    );
  }

  const editInitialData = {
    id: contrato.id,
    numero: contrato.numero,
    titulo: contrato.titulo,
    descricao: contrato.descricao,
    solicitanteId: contrato.solicitante?.id ?? null,
    slaPolicyId: contrato.slaPolicy?.id ?? null,
    slaRespostaHoras: contrato.slaRespostaHoras,
    slaSolucaoHoras: contrato.slaSolucaoHoras,
    inicioVigencia: contrato.inicioVigencia,
    fimVigencia: contrato.fimVigencia,
    renovacaoAutomatica: contrato.renovacaoAutomatica,
    valorMensal: contrato.valorMensal != null ? Number(contrato.valorMensal) : null,
    observacoes: contrato.observacoes
  };

  const podeAtivar = contrato.status === "DRAFT" || contrato.status === "SUSPENDED";
  const podeSuspender = contrato.status === "ACTIVE";
  const podeRenovar = contrato.status !== "CANCELLED";
  const podeCancelar = contrato.status !== "CANCELLED";

  return (
    <PageContainer>
      <HeaderRow>
        <div>
          <TitleLine>
            <PageTitle>{contrato.titulo}</PageTitle>
            <ContratoStatusPill status={contrato.status} />
          </TitleLine>
          <PageSubtitle>
            {`Contrato ${contrato.numero} · ${
              contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || "sem empresa vinculada"
            }`}
          </PageSubtitle>
        </div>
        <ActionsBar>
          <Button variant="ghost" onClick={() => router.push("/contratos")}>
            <FiArrowLeft aria-hidden="true" /> Voltar
          </Button>
          {podeAtivar ? (
            <Button variant="save" onClick={() => runAction("/ativar", {}, "Contrato ativado.")} disabled={busy}>
              <FiPlay aria-hidden="true" /> Ativar
            </Button>
          ) : null}
          {podeSuspender ? (
            <Button variant="ghost" onClick={() => runAction("/suspender", {}, "Contrato suspenso.")} disabled={busy}>
              <FiPauseCircle aria-hidden="true" /> Suspender
            </Button>
          ) : null}
          {podeRenovar ? (
            <Button variant="ghost" onClick={openRenovar} disabled={busy}>
              <FiRefreshCw aria-hidden="true" /> Renovar
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setEditOpen(true)} disabled={busy}>
            <FiEdit2 aria-hidden="true" /> Editar
          </Button>
          {podeCancelar ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={busy}>
              <FiXCircle aria-hidden="true" /> Cancelar
            </Button>
          ) : null}
          <Button variant="danger" onClick={handleExcluir} disabled={busy}>
            <FiTrash2 aria-hidden="true" /> Excluir
          </Button>
        </ActionsBar>
      </HeaderRow>

      <Card as="section">
        <SectionTitle>Dados do contrato</SectionTitle>
        <InfoGrid>
          <Field>
            <FieldLabel>Empresa</FieldLabel>
            <FieldValue>
              {contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || "-"}
            </FieldValue>
          </Field>
          <Field>
            <FieldLabel>Serviço</FieldLabel>
            <FieldValue>
              {!contrato.solicitante ? (
                "-"
              ) : contrato.solicitante.status === false ? (
                <Badge tone="warning">Empresa desativada</Badge>
              ) : contrato.solicitante.servico_bloqueado ? (
                <Badge tone="warning">
                  {contrato.solicitante.servico_bloqueado_motivo || "Bloqueado"}
                </Badge>
              ) : (
                <Badge tone="success">Liberado</Badge>
              )}
            </FieldValue>
          </Field>
          <Field>
            <FieldLabel>Vigência</FieldLabel>
            <FieldValue>{`${formatDateBR(contrato.inicioVigencia)} — ${
              contrato.fimVigencia ? formatDateBR(contrato.fimVigencia) : "indeterminada"
            }`}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Valor mensal</FieldLabel>
            <FieldValue>{formatCurrencyBRL(contrato.valorMensal)}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>SLA resposta / solução</FieldLabel>
            <FieldValue>{`${contrato.slaRespostaHoras ?? "-"} h / ${contrato.slaSolucaoHoras ?? "-"} h`}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Política herdada</FieldLabel>
            <FieldValue>{contrato.slaPolicy?.nome || "Nenhuma"}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Renovação automática</FieldLabel>
            <FieldValue>{contrato.renovacaoAutomatica ? "Ativada" : "Desativada"}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Termos / tickets</FieldLabel>
            <FieldValue>{`${contrato._count?.termos ?? 0} / ${contrato._count?.tickets ?? 0}`}</FieldValue>
          </Field>
          {contrato.renovadoDe ? (
            <Field>
              <FieldLabel>Renovado de</FieldLabel>
              <FieldValue>{contrato.renovadoDe.numero}</FieldValue>
            </Field>
          ) : null}
          {contrato.status === "CANCELLED" ? (
            <Field>
              <FieldLabel>Cancelamento</FieldLabel>
              <FieldValue>{`${formatDateTimeBR(contrato.canceladoEm)} · ${
                contrato.motivoCancelamento || "-"
              }`}</FieldValue>
            </Field>
          ) : null}
        </InfoGrid>
        {contrato.descricao ? (
          <Field style={{ marginTop: 16 }}>
            <FieldLabel>Descrição</FieldLabel>
            <FieldValue>{contrato.descricao}</FieldValue>
          </Field>
        ) : null}
      </Card>

      <TermosSlaPanel
        contratoId={contrato.id}
        readOnly={contrato.status === "CANCELLED" || contrato.status === "EXPIRED"}
      />

      <Card as="section">
        <SectionTitle>Histórico</SectionTitle>
        {contrato.historico.length === 0 ? (
          <FieldValue>Nenhum registro de auditoria.</FieldValue>
        ) : (
          <Timeline>
            {contrato.historico.map((item) => (
              <TimelineItem key={item.id}>
                <span>{auditActionLabels[item.action] || item.action}</span>
                <TimelineWhen>{formatDateTimeBR(item.createdAt)}</TimelineWhen>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Card>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar contrato">
        <ContratoForm
          initialData={editInitialData}
          onCancel={() => setEditOpen(false)}
          onSubmit={handleEdit}
          loading={busy}
        />
      </Modal>

      <Modal isOpen={renovarOpen} onClose={() => setRenovarOpen(false)} title="Renovar contrato">
        <Form>
          <Hint>
            A renovação cria um novo contrato ativo herdando termos e condições. O contrato atual é
            encerrado na data de início informada.
          </Hint>
          <FieldGroup>
            Novo número
            <Input
              value={renovarForm.numero}
              placeholder="Gerado automaticamente"
              onChange={(event) => setRenovarForm((prev) => ({ ...prev, numero: event.target.value }))}
            />
          </FieldGroup>
          <FieldGroup>
            Início da nova vigência
            <Input
              type="date"
              value={renovarForm.inicioVigencia}
              onChange={(event) =>
                setRenovarForm((prev) => ({ ...prev, inicioVigencia: event.target.value }))
              }
            />
          </FieldGroup>
          <FieldGroup>
            Fim da nova vigência
            <Input
              type="date"
              value={renovarForm.fimVigencia}
              onChange={(event) =>
                setRenovarForm((prev) => ({ ...prev, fimVigencia: event.target.value }))
              }
            />
            <Hint>Deixe vazio para manter a mesma duração ou vigência indeterminada.</Hint>
          </FieldGroup>
          <FieldGroup>
            Valor mensal (R$)
            <Input
              inputMode="decimal"
              value={renovarForm.valorMensal}
              onChange={(event) =>
                setRenovarForm((prev) => ({ ...prev, valorMensal: event.target.value }))
              }
            />
          </FieldGroup>
          <FieldGroup>
            Observações
            <Textarea
              value={renovarForm.observacoes}
              onChange={(event) =>
                setRenovarForm((prev) => ({ ...prev, observacoes: event.target.value }))
              }
            />
          </FieldGroup>
          <ModalActions>
            <Button variant="ghost" onClick={() => setRenovarOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleRenovar} disabled={busy}>
              {busy ? "Renovando..." : "Renovar contrato"}
            </Button>
          </ModalActions>
        </Form>
      </Modal>

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar contrato">
        <Form>
          <Hint>
            O cancelamento interrompe o serviço da empresa até que um novo contrato seja ativado. O
            acesso ao sistema é mantido.
          </Hint>
          <FieldGroup>
            Motivo do cancelamento
            <Textarea
              required
              value={cancelMotivo}
              onChange={(event) => setCancelMotivo(event.target.value)}
            />
          </FieldGroup>
          <ModalActions>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelar}
              disabled={busy || cancelMotivo.trim().length < 3}
            >
              {busy ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </ModalActions>
        </Form>
      </Modal>
    </PageContainer>
  );
}
