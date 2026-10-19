"use client";

import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { api } from "@/services/api";
import { Credential } from "@/types/inventory";
import { ACCESS_POLICY_LABELS, ACCESS_POLICY_OPTIONS, PROTOCOL_LABELS, PROTOCOL_OPTIONS } from "./labels";

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

const Hint = styled.span`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.25rem;
`;

interface UserOption {
  id: string;
  name: string;
}

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  credential?: Credential | null;
}

/**
 * Modal de cadastro/edição de credencial do cofre. Na edição, a senha é opcional
 * (quando em branco, a senha atual é mantida).
 */
export function CredentialModal({ isOpen, onClose, onSubmit, credential }: CredentialModalProps) {
  const isEdit = Boolean(credential);
  const [label, setLabel] = useState("");
  const [protocol, setProtocol] = useState("SSH");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [notes, setNotes] = useState("");
  const [accessPolicy, setAccessPolicy] = useState("OWNER_AND_ADMINS");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const list = await api.users.list();
      const normalized = (Array.isArray(list) ? list : []).map((u: Record<string, unknown>) => ({
        id: String(u.id),
        name: String(u.name || u.email || u.id)
      }));
      setUsers(normalized);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadUsers();
    if (credential) {
      setLabel(credential.label);
      setProtocol(credential.protocol);
      setPort(credential.port ? String(credential.port) : "");
      setUsername(credential.username ?? "");
      setSecret("");
      setNotes(credential.notes ?? "");
      setAccessPolicy(credential.accessPolicy);
      setOwnerUserId(credential.ownerUserId ?? "");
    } else {
      setLabel("");
      setProtocol("SSH");
      setPort("");
      setUsername("");
      setSecret("");
      setNotes("");
      setAccessPolicy("OWNER_AND_ADMINS");
      setOwnerUserId("");
    }
  }, [isOpen, credential, loadUsers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        label: label.trim(),
        protocol,
        port: port ? Number(port) : null,
        username: username.trim() || null,
        notes: notes.trim() || null,
        accessPolicy,
        ownerUserId: ownerUserId || null
      };
      // Na criação a senha é obrigatória; na edição só é enviada se preenchida
      if (secret) payload.secret = secret;
      const ok = await onSubmit(payload);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const secretRequired = !isEdit;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar credencial" : "Nova credencial"}>
      <form onSubmit={handleSubmit}>
        <Grid>
          <Field $full>
            Rótulo *
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={120} />
          </Field>
          <Field>
            Protocolo
            <Select value={protocol} onChange={(e) => setProtocol(e.target.value)}>
              {PROTOCOL_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PROTOCOL_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Porta
            <Input
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="22"
            />
          </Field>
          <Field>
            Usuário
            <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={180} autoComplete="off" />
          </Field>
          <Field>
            Senha {secretRequired ? "*" : ""}
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required={secretRequired}
              autoComplete="new-password"
              placeholder={isEdit ? "Deixe em branco para manter a atual" : ""}
            />
            {isEdit ? <Hint>Preencha apenas se quiser trocar a senha (a troca é registrada na auditoria).</Hint> : null}
          </Field>
          <Field $full>
            Política de acesso
            <Select value={accessPolicy} onChange={(e) => setAccessPolicy(e.target.value)}>
              {ACCESS_POLICY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {ACCESS_POLICY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field $full>
            Responsável
            <Select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
              <option value="">Eu (autor da credencial)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Hint>O responsável sempre pode visualizar a senha desta credencial.</Hint>
          </Field>
          <Field $full>
            Observações
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Grid>
        <Footer>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !label.trim() || (secretRequired && !secret)}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </Footer>
      </form>
    </Modal>
  );
}
