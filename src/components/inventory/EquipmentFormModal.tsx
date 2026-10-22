"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { api } from "@/services/api";
import { Equipment } from "@/types/inventory";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_TYPE_OPTIONS,
  MANAGEMENT_CONTROLLER_LABELS,
  MANAGEMENT_CONTROLLER_OPTIONS,
  PARENT_CAPABLE_TYPES,
  VIRTUALIZATION_PLATFORM_LABELS,
  VIRTUALIZATION_PLATFORM_OPTIONS
} from "./labels";

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

const SectionTitle = styled.div`
  grid-column: 1 / -1;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  padding-bottom: 0.35rem;
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
  // Hierarquia e infraestrutura virtualizada
  parentId: string;
  virtualizationPlatform: string;
  managementController: string;
  managementIp: string;
  managementUrl: string;
  url: string;
  vmid: string;
  guestOs: string;
  cpuCores: string;
  memoryGb: string;
  diskGb: string;
  tags: string;
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
  solicitanteId: "",
  parentId: "",
  virtualizationPlatform: "",
  managementController: "",
  managementIp: "",
  managementUrl: "",
  url: "",
  vmid: "",
  guestOs: "",
  cpuCores: "",
  memoryGb: "",
  diskGb: "",
  tags: ""
};

type SolicitanteOption = { id: string; nome_fantasia: string };
type ParentOption = { id: string; name: string; type: string };

// Contexto opcional ao abrir o formulário para adicionar um recurso dentro de um ativo
export type EquipmentFormPreset = {
  parentId?: string;
  parentName?: string;
  parentType?: string;
  type?: string;
  solicitanteId?: string | null;
};

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  equipment?: Equipment | null;
  preset?: EquipmentFormPreset | null;
}

/**
 * Modal de cadastro/edição de equipamento, com campos de hierarquia e virtualização
 * exibidos conforme o tipo do ativo. Aceita um contexto (`preset`) para já abrir
 * vinculado a um host ao adicionar recursos filhos.
 */
export function EquipmentFormModal({ isOpen, onClose, onSubmit, equipment, preset }: EquipmentFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [saving, setSaving] = useState(false);

  const isHypervisor = form.type === "HYPERVISOR";
  const isServer = form.type === "SERVER";
  const isVirtual = form.type === "VM" || form.type === "CONTAINER";
  const isCompute = isHypervisor || isServer || isVirtual;

  // Carrega os clientes disponíveis para vincular ao equipamento
  useEffect(() => {
    if (!isOpen) return;
    api.solicitantes
      .list({ page: "1", pageSize: "100", sortBy: "nome_fantasia", sortDir: "asc" })
      .then((res) => setSolicitantes(res.data))
      .catch(() => setSolicitantes([]));
  }, [isOpen]);

  // Carrega os possíveis hosts (servidores/hypervisors/VMs) do cliente selecionado
  useEffect(() => {
    if (!isOpen) return;
    const params: Record<string, string> = { page: "1", pageSize: "200" };
    if (form.solicitanteId) params.solicitanteId = form.solicitanteId;

    api.inventory
      .list(params)
      .then((res) => {
        const list: ParentOption[] = res.data
          .filter((item) => PARENT_CAPABLE_TYPES.includes(item.type) && item.id !== equipment?.id)
          .map((item) => ({ id: item.id, name: item.name, type: item.type }));

        // Garante que o host de origem apareça como opção mesmo fora do filtro atual
        if (preset?.parentId && !list.some((parent) => parent.id === preset.parentId)) {
          list.unshift({
            id: preset.parentId,
            name: preset.parentName ?? "Host selecionado",
            type: preset.parentType ?? "HYPERVISOR"
          });
        }
        setParents(list);
      })
      .catch(() => setParents([]));
  }, [isOpen, form.solicitanteId, equipment?.id, preset?.parentId, preset?.parentName, preset?.parentType]);

  // Preenche o formulário ao abrir (edição, novo recurso em um host ou novo ativo)
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
        solicitanteId: equipment.solicitanteId ?? "",
        parentId: equipment.parentId ?? "",
        virtualizationPlatform: equipment.virtualizationPlatform ?? "",
        managementController: equipment.managementController ?? "",
        managementIp: equipment.managementIp ?? "",
        managementUrl: equipment.managementUrl ?? "",
        url: equipment.url ?? "",
        vmid: equipment.vmid !== null && equipment.vmid !== undefined ? String(equipment.vmid) : "",
        guestOs: equipment.guestOs ?? "",
        cpuCores: equipment.cpuCores !== null && equipment.cpuCores !== undefined ? String(equipment.cpuCores) : "",
        memoryGb:
          equipment.memoryMb !== null && equipment.memoryMb !== undefined
            ? String(Math.round(equipment.memoryMb / 1024))
            : "",
        diskGb: equipment.diskGb !== null && equipment.diskGb !== undefined ? String(equipment.diskGb) : "",
        tags: (equipment.tags ?? []).join(", ")
      });
      return;
    }

    setForm({
      ...emptyForm,
      type: preset?.type ?? emptyForm.type,
      parentId: preset?.parentId ?? "",
      solicitanteId: preset?.solicitanteId ?? ""
    });
  }, [isOpen, equipment, preset]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Converte texto vazio em null e números em inteiros
  const toNumberOrNull = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Normaliza campos vazios como null antes de enviar
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const memoryGb = toNumberOrNull(form.memoryGb);
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
        solicitanteId: form.solicitanteId || null,
        parentId: form.parentId || null,
        virtualizationPlatform: isHypervisor && form.virtualizationPlatform ? form.virtualizationPlatform : null,
        managementController:
          (isServer || isHypervisor) && form.managementController ? form.managementController : null,
        managementIp: (isServer || isHypervisor) && form.managementIp.trim() ? form.managementIp.trim() : null,
        managementUrl: (isServer || isHypervisor) && form.managementUrl.trim() ? form.managementUrl.trim() : null,
        url: form.url.trim() || null,
        vmid: isVirtual ? toNumberOrNull(form.vmid) : null,
        guestOs: isVirtual && form.guestOs.trim() ? form.guestOs.trim() : null,
        cpuCores: isCompute ? toNumberOrNull(form.cpuCores) : null,
        memoryMb: isCompute && memoryGb !== null ? memoryGb * 1024 : null,
        diskGb: isCompute ? toNumberOrNull(form.diskGb) : null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };
      const ok = await onSubmit(payload);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  // Campo de vínculo com o host pai (recursos virtualizados e hosts de virtualização)
  const parentField = (
    <Field $full>
      Host pai
      <Select value={form.parentId} onChange={(e) => setField("parentId", e.target.value)}>
        <option value="">Sem host vinculado</option>
        {parents.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {parent.name} ({EQUIPMENT_TYPE_LABELS[parent.type as keyof typeof EQUIPMENT_TYPE_LABELS]})
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        equipment
          ? "Editar equipamento"
          : preset?.parentId
            ? `Novo recurso em ${preset.parentName ?? "host selecionado"}`
            : "Novo equipamento"
      }
    >
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
          <Field $full>
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

          {isVirtual ? (
            <>
              <SectionTitle>Recurso virtualizado</SectionTitle>
              {parentField}
              <Field>
                VMID no hypervisor
                <Input
                  value={form.vmid}
                  onChange={(e) => setField("vmid", e.target.value)}
                  inputMode="numeric"
                  placeholder="ex.: 100"
                />
              </Field>
              <Field>
                Sistema operacional
                <Input value={form.guestOs} onChange={(e) => setField("guestOs", e.target.value)} maxLength={120} />
              </Field>
            </>
          ) : null}

          {isHypervisor ? (
            <>
              <SectionTitle>Host de virtualização</SectionTitle>
              <Field $full>
                Plataforma *
                <Select
                  value={form.virtualizationPlatform}
                  onChange={(e) => setField("virtualizationPlatform", e.target.value)}
                  required
                >
                  <option value="">Selecione a plataforma</option>
                  {VIRTUALIZATION_PLATFORM_OPTIONS.map((platform) => (
                    <option key={platform} value={platform}>
                      {VIRTUALIZATION_PLATFORM_LABELS[platform]}
                    </option>
                  ))}
                </Select>
              </Field>
              {parentField}
            </>
          ) : null}

          {isCompute ? (
            <>
              <SectionTitle>Recursos</SectionTitle>
              <Field>
                vCPU (núcleos)
                <Input value={form.cpuCores} onChange={(e) => setField("cpuCores", e.target.value)} inputMode="numeric" />
              </Field>
              <Field>
                Memória (GB)
                <Input value={form.memoryGb} onChange={(e) => setField("memoryGb", e.target.value)} inputMode="numeric" />
              </Field>
              <Field>
                Disco (GB)
                <Input value={form.diskGb} onChange={(e) => setField("diskGb", e.target.value)} inputMode="numeric" />
              </Field>
            </>
          ) : null}

          <SectionTitle>Gerenciamento fora de banda</SectionTitle>
          <Field>
            Controlador
            <Select
              value={form.managementController}
              onChange={(e) => setField("managementController", e.target.value)}
            >
              <option value="">Não informado</option>
              {MANAGEMENT_CONTROLLER_OPTIONS.map((controller) => (
                <option key={controller} value={controller}>
                  {MANAGEMENT_CONTROLLER_LABELS[controller]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            IP de gerência
            <Input
              value={form.managementIp}
              onChange={(e) => setField("managementIp", e.target.value)}
              maxLength={64}
              placeholder="ex.: 10.0.0.10"
            />
          </Field>
          <Field>
            URL de gerência
            <Input
              value={form.managementUrl}
              onChange={(e) => setField("managementUrl", e.target.value)}
              maxLength={500}
              placeholder="ex.: https://10.0.0.10"
            />
          </Field>
          <Field>
            Link de acesso do ativo
            <Input
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              maxLength={500}
              placeholder="ex.: https://10.0.0.5:8006"
            />
          </Field>
          <Field $full>
            Tags (separadas por vírgula)
            <Input
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder="ex.: produção, zabbix, cliente-x"
            />
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
          <Button
            type="submit"
            variant="primary"
            disabled={saving || form.name.trim().length < 2 || (isHypervisor && !form.virtualizationPlatform)}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </Footer>
      </form>
    </Modal>
  );
}
