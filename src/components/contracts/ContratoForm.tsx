"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toDateInputValue } from "./contract-constants";

export interface ContratoFormPayload {
  numero: string;
  titulo: string;
  descricao: string | null;
  solicitanteId: string | null;
  slaPolicyId: string | null;
  slaRespostaHoras: number | null;
  slaSolucaoHoras: number | null;
  inicioVigencia: string;
  fimVigencia: string | null;
  renovacaoAutomatica: boolean;
  valorMensal: number | null;
  observacoes: string | null;
}

interface SolicitanteOption {
  id: string;
  nome_fantasia: string;
  razao_social: string;
}

interface SlaPolicyOption {
  id: string;
  nome: string;
}

export interface ContratoFormInitialData extends Partial<ContratoFormPayload> {
  id?: string;
}

interface ContratoFormProps {
  initialData?: ContratoFormInitialData | null;
  onCancel: () => void;
  onSubmit: (payload: ContratoFormPayload) => void | Promise<void>;
  loading?: boolean;
}

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Grid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns ?? 2}, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  cursor: pointer;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const Hint = styled.small`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formulário de contrato (criação e edição).
 * Carrega as empresas e a política global de SLA para os seletores.
 */
export function ContratoForm({ initialData, onCancel, onSubmit, loading = false }: ContratoFormProps) {
  const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
  const [politica, setPolitica] = useState<SlaPolicyOption | null>(null);

  const [numero, setNumero] = useState(initialData?.numero ?? "");
  const [titulo, setTitulo] = useState(initialData?.titulo ?? "");
  const [descricao, setDescricao] = useState(initialData?.descricao ?? "");
  const [solicitanteId, setSolicitanteId] = useState(initialData?.solicitanteId ?? "");
  const [slaPolicyId, setSlaPolicyId] = useState(initialData?.slaPolicyId ?? "");
  const [slaRespostaHoras, setSlaRespostaHoras] = useState(
    initialData?.slaRespostaHoras != null ? String(initialData.slaRespostaHoras) : ""
  );
  const [slaSolucaoHoras, setSlaSolucaoHoras] = useState(
    initialData?.slaSolucaoHoras != null ? String(initialData.slaSolucaoHoras) : ""
  );
  const [inicioVigencia, setInicioVigencia] = useState(toDateInputValue(initialData?.inicioVigencia));
  const [fimVigencia, setFimVigencia] = useState(toDateInputValue(initialData?.fimVigencia));
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(initialData?.renovacaoAutomatica ?? false);
  const [valorMensal, setValorMensal] = useState(
    initialData?.valorMensal != null ? String(initialData.valorMensal) : ""
  );
  const [observacoes, setObservacoes] = useState(initialData?.observacoes ?? "");

  useEffect(() => {
    let active = true;

    fetch("/api/solicitantes?page=1&pageSize=200&sortBy=nome_fantasia&sortDir=asc")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (active) setSolicitantes(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setSolicitantes([]);
      });

    fetch("/api/settings/sla-policy")
      .then((res) => (res.ok ? res.json() : { data: null }))
      .then((json) => {
        if (active) setPolitica(json?.data ?? null);
      })
      .catch(() => {
        if (active) setPolitica(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasOptions = useMemo(() => solicitantes.length > 0, [solicitantes.length]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!numero.trim() || !titulo.trim() || !inicioVigencia) return;

    onSubmit({
      numero: numero.trim(),
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      solicitanteId: solicitanteId || null,
      slaPolicyId: slaPolicyId || null,
      slaRespostaHoras: toNumberOrNull(slaRespostaHoras),
      slaSolucaoHoras: toNumberOrNull(slaSolucaoHoras),
      inicioVigencia,
      fimVigencia: fimVigencia || null,
      renovacaoAutomatica,
      valorMensal: toNumberOrNull(valorMensal),
      observacoes: observacoes.trim() || null
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Grid>
        <FieldGroup>
          Número
          <Input
            required
            value={numero}
            placeholder="CT-2026-001"
            onChange={(event) => setNumero(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          Título
          <Input
            required
            value={titulo}
            placeholder="Contrato de suporte"
            onChange={(event) => setTitulo(event.target.value)}
          />
        </FieldGroup>
      </Grid>

      <FieldGroup>
        Empresa (solicitante)
        <Select value={solicitanteId} onChange={(event) => setSolicitanteId(event.target.value)}>
          <option value="">Sem vínculo (vincular depois)</option>
          {solicitantes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome_fantasia || item.razao_social}
            </option>
          ))}
        </Select>
        {!hasOptions ? <Hint>Nenhuma empresa cadastrada encontrada.</Hint> : null}
      </FieldGroup>

      <Grid>
        <FieldGroup>
          Início da vigência
          <Input
            required
            type="date"
            value={inicioVigencia}
            onChange={(event) => setInicioVigencia(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          Fim da vigência
          <Input type="date" value={fimVigencia} onChange={(event) => setFimVigencia(event.target.value)} />
          <Hint>Deixe vazio para vigência indeterminada.</Hint>
        </FieldGroup>
      </Grid>

      <Grid $columns={3}>
        <FieldGroup>
          Valor mensal (R$)
          <Input
            inputMode="decimal"
            value={valorMensal}
            placeholder="1500,00"
            onChange={(event) => setValorMensal(event.target.value)}
          />
        </FieldGroup>
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
            inputMode="numeric"
            value={slaSolucaoHoras}
            placeholder="8"
            onChange={(event) => setSlaSolucaoHoras(event.target.value)}
          />
        </FieldGroup>
      </Grid>

      <FieldGroup>
        Política de SLA herdada
        <Select value={slaPolicyId} onChange={(event) => setSlaPolicyId(event.target.value)}>
          <option value="">Sem política (usa apenas valores do contrato)</option>
          {politica ? (
            <option value={politica.id}>{politica.nome} (global)</option>
          ) : null}
        </Select>
        <Hint>Usada como último recurso quando o tipo de ticket e o contrato não definem horas.</Hint>
      </FieldGroup>

      <CheckboxRow>
        <input
          type="checkbox"
          checked={renovacaoAutomatica}
          onChange={(event) => setRenovacaoAutomatica(event.target.checked)}
        />
        Renovar automaticamente ao vencer
      </CheckboxRow>

      <FieldGroup>
        Descrição
        <Textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} />
      </FieldGroup>

      <FieldGroup>
        Observações
        <Textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
      </FieldGroup>

      <Actions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Salvando..." : initialData?.id ? "Salvar alterações" : "Criar contrato"}
        </Button>
      </Actions>
    </Form>
  );
}
