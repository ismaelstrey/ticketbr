"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useSharedSecrets } from "@/hooks/useInventory";
import { SharedSecret } from "@/types/inventory";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  max-height: 240px;
  overflow-y: auto;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
`;

const RowInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const RowTitle = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const RowSub = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const RowActions = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const IconButton = styled.button<{ $danger?: boolean }>`
  background: none;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  cursor: pointer;
  padding: 0.35rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  color: ${({ theme, $danger }) =>
    $danger ? theme.tokens.color.status.warning : theme.tokens.color.interactive.primary};
  display: inline-flex;
  align-items: center;

  &:hover {
    background: ${({ theme, $danger }) =>
      $danger ? theme.tokens.color.status.warningSurface : theme.tokens.color.interactive.ghostHover};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  padding-top: 1rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const Hint = styled.p`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  margin: 0;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

interface SharedSecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitanteId: string | null;
  solicitanteName?: string | null;
}

/**
 * Modal de gestão das senhas padrão de um cliente. As senhas aqui cadastradas
 * podem ser reaproveitadas por qualquer equipamento do mesmo cliente e, ao serem
 * alteradas, refletem automaticamente em todas as credenciais vinculadas.
 */
export function SharedSecretsModal({ isOpen, onClose, solicitanteId, solicitanteName }: SharedSecretsModalProps) {
  const { sharedSecrets, loading, create, update, remove } = useSharedSecrets(solicitanteId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setSecret("");
    setNotes("");
  };

  // Carrega a senha padrão selecionada no formulário para edição
  const startEdit = (item: SharedSecret) => {
    setEditingId(item.id);
    setLabel(item.label);
    setSecret("");
    setNotes(item.notes ?? "");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      // Na edição a senha é opcional: em branco mantém a atual
      const payload: Record<string, unknown> = { label: label.trim(), notes: notes.trim() || null };
      if (secret) payload.secret = secret;
      const ok = editingId ? await update(editingId, payload) : await create(payload);
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={solicitanteName ? `Senhas padrão · ${solicitanteName}` : "Senhas padrão do cliente"}
    >
      {!solicitanteId ? (
        <Hint>
          Este equipamento não está vinculado a um cliente. Associe um cliente ao equipamento para usar senhas padrão
          compartilhadas.
        </Hint>
      ) : (
        <>
          <List>
            {loading && !sharedSecrets.length ? <RowSub>Carregando senhas padrão...</RowSub> : null}
            {!loading && !sharedSecrets.length ? <RowSub>Nenhuma senha padrão cadastrada.</RowSub> : null}
            {sharedSecrets.map((item) => (
              <Row key={item.id}>
                <RowInfo>
                  <RowTitle>{item.label}</RowTitle>
                  <RowSub>{item.credentialCount} equipamento(s) usando esta senha</RowSub>
                </RowInfo>
                <RowActions>
                  <IconButton type="button" onClick={() => startEdit(item)} title="Editar">
                    <FiEdit2 />
                  </IconButton>
                  <IconButton type="button" $danger onClick={() => remove(item.id)} title="Excluir">
                    <FiTrash2 />
                  </IconButton>
                </RowActions>
              </Row>
            ))}
          </List>

          <Form onSubmit={handleSubmit}>
            <Field>
              Rótulo *
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={120}
                placeholder="Ex.: Senha padrão dos roteadores"
              />
            </Field>
            <Field>
              Senha {editingId ? "" : "*"}
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required={!editingId}
                autoComplete="new-password"
                placeholder={editingId ? "Deixe em branco para manter a atual" : ""}
              />
            </Field>
            <Field>
              Observações
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </Field>
            <Hint>
              Alterar a senha aqui atualiza automaticamente todos os equipamentos do cliente que a utilizam.
            </Hint>
            <Footer>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                  Cancelar edição
                </Button>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !label.trim() || (!editingId && !secret)}
              >
                {editingId ? "Salvar alterações" : "Criar senha padrão"}
              </Button>
            </Footer>
          </Form>
        </>
      )}
    </Modal>
  );
}
