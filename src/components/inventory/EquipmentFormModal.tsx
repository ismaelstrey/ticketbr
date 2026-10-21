"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { api } from "@/services/api";
import { Equipment } from "@/types/inventory";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_OPTIONS, EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPE_OPTIONS } from "./labels";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label<{ $full?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  grid-column: ${({ $full }) => ($full ? "1 / -1" : "auto")};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.25rem;
`;

type FormState = {
  code: string;
  name: string;
  type: string;
  status: string;
  brand: string;
  model: string;
  serialNumber: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  location: string;
  func: string;
  description: string;
  solicitanteId: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  type: "SWITCH",
  status: "ACTIVE",
  brand: "",
  model: "",
  serialNumber: "",
  hostname: "",
  ipAddress: "",
  macAddress: "",
  location: "",
  func: "",
  description: "",
  solicitanteId: ""
};

type SolicitanteOption = { id: string; nome_fantasia: string };

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  equipment?: Equipment | null;
}

/**
 * Modal de cadastro/edição de equipamento.
 */
export function EquipmentFormModal({ isOpen, onClose, onSubmit, equipment }: EquipmentFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Carrega os clientes disponíveis para vincular ao equipamento
  useEffect(() => {
    if (!isOpen) return;
    api.solicitantes
      .list({ page: "1", pageSize: "100", sortBy: "nome_fantasia", sortDir: "asc" })
      .then((res) => setSolicitantes(res.data))
      .catch(() => setSolicitantes([]));
  }, [isOpen]);

  // Preenche o formulário ao abrir (edição) ou limpa (novo)
  useEffect(() => {
    if (!isOpen) return;
    if (equipment) {
      setForm({
        code: equipment.code ?? "",
        name: equipment.name ?? "",
        type: equipment.type,
        status: equipment.status,
        brand: equipment.brand ?? "",
        model: equipment.model ?? "",
        serialNumber: equipment.serialNumber ?? "",
        hostname: equipment.hostname ?? "",
        ipAddress: equipment.ipAddress ?? "",
        macAddress: equipment.macAddress ?? "",
        location: equipment.location ?? "",
        func: equipment.func ?? "",
        description: equipment.description ?? "",
        solicitanteId: equipment.solicitanteId ?? ""
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, equipment]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Normaliza campos vazios como null antes de enviar
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        code: form.code.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        hostname: form.hostname.trim() || null,
        ipAddress: form.ipAddress.trim() || null,
        macAddress: form.macAddress.trim() || null,
        location: form.location.trim() || null,
        func: form.func.trim() || null,
        description: form.description.trim() || null,
        solicitanteId: form.solicitanteId || null
      };
      const ok = await onSubmit(payload);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={equipment ? "Editar equipamento" : "Novo equipamento"}>
      <form onSubmit={handleSubmit}>
        <Grid>
          <Field>
            Nome *
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required maxLength={180} />
          </Field>
          <Field>
            Código / patrimônio
            <Input value={form.code} onChange={(e) => setField("code", e.target.value)} maxLength={60} />
          </Field>
          <Field>
            Tipo *
            <Select value={form.type} onChange={(e) => setField("type", e.target.value)}>
              {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {EQUIPMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Status
            <Select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              {EQUIPMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {EQUIPMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Endereço IP
            <Input value={form.ipAddress} onChange={(e) => setField("ipAddress", e.target.value)} maxLength={64} />
          </Field>
          <Field>
            Hostname
            <Input value={form.hostname} onChange={(e) => setField("hostname", e.target.value)} maxLength={180} />
          </Field>
          <Field>
            Fabricante
            <Input value={form.brand} onChange={(e) => setField("brand", e.target.value)} maxLength={120} />
          </Field>
          <Field>
            Modelo
            <Input value={form.model} onChange={(e) => setField("model", e.target.value)} maxLength={120} />
          </Field>
          <Field>
            Número de série
            <Input value={form.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} maxLength={120} />
          </Field>
          <Field>
            Endereço MAC
            <Input value={form.macAddress} onChange={(e) => setField("macAddress", e.target.value)} maxLength={64} />
          </Field>
          <Field>
            Localização
            <Input value={form.location} onChange={(e) => setField("location", e.target.value)} maxLength={180} />
          </Field>
          <Field>
            Função
            <Input value={form.func} onChange={(e) => setField("func", e.target.value)} maxLength={180} />
          </Field>
          <Field>
            Cliente (Solicitante)
            <Select value={form.solicitanteId} onChange={(e) => setField("solicitanteId", e.target.value)}>
              <option value="">Sem cliente vinculado</option>
              {solicitantes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome_fantasia}
                </option>
              ))}
            </Select>
          </Field>
          <Field $full>
            Descrição
            <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} />
          </Field>
        </Grid>
        <Footer>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving || form.name.trim().length < 2}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </Footer>
      </form>
    </Modal>
  );
}
