"use client";

import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useUserGroups } from "@/hooks/useInventory";
import { UserGroup } from "@/types/inventory";

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

const MemberList = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  max-height: 160px;
  overflow-y: auto;
  padding: 0.5rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
`;

const MemberItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-weight: 400;
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

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de gestão dos grupos de usuários usados na ACL do cofre (somente ADMIN edita).
 */
export function GroupsModal({ isOpen, onClose }: GroupsModalProps) {
  const { groups, loading, create, update, remove } = useUserGroups();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [users, setUsers] = useState<UserOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Carrega os usuários disponíveis para compor os grupos
  const loadUsers = useCallback(async () => {
    try {
      const list = await api.users.list();
      const normalized = (Array.isArray(list) ? list : []).map((u: Record<string, unknown>) => ({
        id: String(u.id),
        name: String(u.name || u.email || u.id),
        email: String(u.email || "")
      }));
      setUsers(normalized);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen, loadUsers]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setMemberIds([]);
  };

  // Carrega o grupo selecionado no formulário para edição
  const startEdit = (group: UserGroup) => {
    setEditingId(group.id);
    setName(group.name);
    setDescription(group.description ?? "");
    setMemberIds(group.members.map((m) => m.id));
  };

  const toggleMember = (userId: string) => {
    setMemberIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, memberIds };
      const ok = editingId ? await update(editingId, payload) : await create(payload);
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grupos de acesso">
      <List>
        {loading && !groups.length ? <RowSub>Carregando grupos...</RowSub> : null}
        {!loading && !groups.length ? <RowSub>Nenhum grupo cadastrado.</RowSub> : null}
        {groups.map((group) => (
          <Row key={group.id}>
            <RowInfo>
              <RowTitle>{group.name}</RowTitle>
              <RowSub>{group.members.length} membro(s)</RowSub>
            </RowInfo>
            {isAdmin ? (
              <RowActions>
                <IconButton type="button" onClick={() => startEdit(group)} title="Editar">
                  <FiEdit2 />
                </IconButton>
                <IconButton type="button" $danger onClick={() => remove(group.id)} title="Excluir">
                  <FiTrash2 />
                </IconButton>
              </RowActions>
            ) : null}
          </Row>
        ))}
      </List>

      {isAdmin ? (
        <Form onSubmit={handleSubmit}>
          <Field>
            Nome do grupo *
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </Field>
          <Field>
            Descrição
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </Field>
          <Field as="div">
            Membros
            <MemberList>
              {users.map((u) => (
                <MemberItem key={u.id}>
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  {u.name}
                </MemberItem>
              ))}
            </MemberList>
          </Field>
          <Hint>Grupos podem ser usados para conceder acesso a senhas do cofre.</Hint>
          <Footer>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Cancelar edição
              </Button>
            ) : null}
            <Button type="submit" variant="primary" disabled={saving || name.trim().length < 2}>
              {editingId ? "Salvar alterações" : "Criar grupo"}
            </Button>
          </Footer>
        </Form>
      ) : (
        <Hint>Somente administradores podem criar ou alterar grupos.</Hint>
      )}
    </Modal>
  );
}
