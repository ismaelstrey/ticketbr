"use client";

import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { api } from "@/services/api";
import { useCredentialGrants, useUserGroups } from "@/hooks/useInventory";
import { Credential } from "@/types/inventory";

const SectionTitle = styled.h3`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  margin: 0 0 0.6rem;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  max-height: 220px;
  overflow-y: auto;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
`;

const RowInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const Tag = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const RowName = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-size: 0.88rem;
`;

const LevelTag = styled.span<{ $view?: boolean }>`
  font-size: 0.72rem;
  color: ${({ theme, $view }) => ($view ? theme.tokens.color.text.muted : theme.tokens.color.status.success)};
`;

const IconButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  cursor: pointer;
  padding: 0.35rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  color: ${({ theme }) => theme.tokens.color.status.warning};
  display: inline-flex;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.tokens.color.status.warningSurface};
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  padding-top: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const Footer = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
`;

const Hint = styled.span`
  font-size: 0.76rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

interface UserOption {
  id: string;
  name: string;
}

interface GrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
}

/**
 * Modal "Quem pode ver a senha": lista e gerencia as concessões de acesso (ACL) da credencial.
 */
export function GrantModal({ isOpen, onClose, credential }: GrantModalProps) {
  const credentialId = credential?.id ?? null;
  const { grants, loading, addGrant, removeGrant } = useCredentialGrants(isOpen ? credentialId : null);
  const { groups } = useUserGroups();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [subjectType, setSubjectType] = useState<"USER" | "GROUP" | "ROLE">("USER");
  const [subjectId, setSubjectId] = useState("");
  const [role, setRole] = useState<"ADMIN" | "AGENT">("AGENT");
  const [level, setLevel] = useState<"VIEW" | "REVEAL">("REVEAL");
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
    if (isOpen) loadUsers();
  }, [isOpen, loadUsers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload =
        subjectType === "ROLE"
          ? { subjectType, role, level }
          : { subjectType, subjectId, level };
      const ok = await addGrant(payload);
      if (ok) {
        setSubjectId("");
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = subjectType === "ROLE" ? true : Boolean(subjectId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Quem pode ver a senha — ${credential?.label ?? ""}`}>
      <SectionTitle>Acessos concedidos</SectionTitle>
      <List>
        {loading && !grants.length ? <Hint>Carregando...</Hint> : null}
        {!loading && !grants.length ? <Hint>Nenhuma concessão específica. Vale a política da credencial.</Hint> : null}
        {grants.map((grant) => (
          <Row key={grant.id}>
            <RowInfo>
              <Tag>{grant.subjectType}</Tag>
              <RowName>{grant.subjectLabel}</RowName>
              <LevelTag $view={grant.level === "VIEW"}>
                {grant.level === "REVEAL" ? "Pode ver a senha" : "Só metadados"}
              </LevelTag>
            </RowInfo>
            <IconButton type="button" onClick={() => removeGrant(grant.id)} title="Remover acesso">
              <FiTrash2 />
            </IconButton>
          </Row>
        ))}
      </List>

      <Form onSubmit={handleSubmit}>
        <Field>
          Tipo de sujeito
          <Select
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value as "USER" | "GROUP" | "ROLE");
              setSubjectId("");
            }}
          >
            <option value="USER">Usuário</option>
            <option value="GROUP">Grupo</option>
            <option value="ROLE">Papel</option>
          </Select>
        </Field>
        <Field>
          Nível
          <Select value={level} onChange={(e) => setLevel(e.target.value as "VIEW" | "REVEAL")}>
            <option value="REVEAL">Pode ver a senha</option>
            <option value="VIEW">Só metadados</option>
          </Select>
        </Field>
        {subjectType === "USER" ? (
          <Field>
            Usuário
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {subjectType === "GROUP" ? (
          <Field>
            Grupo
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Selecione...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {subjectType === "ROLE" ? (
          <Field>
            Papel
            <Select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "AGENT")}>
              <option value="AGENT">Agentes</option>
              <option value="ADMIN">Administradores</option>
            </Select>
          </Field>
        ) : null}
        <Footer>
          <Hint>
            {subjectType === "ROLE"
              ? role === "AGENT"
                ? "Concede acesso a todos os agentes."
                : "Concede acesso a todos os administradores."
              : "Concede acesso ao sujeito selecionado."}
          </Hint>
          <Button type="submit" variant="primary" disabled={saving || !canSubmit}>
            {saving ? "Concedendo..." : "Conceder acesso"}
          </Button>
        </Footer>
      </Form>
    </Modal>
  );
}
