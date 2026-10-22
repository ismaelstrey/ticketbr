"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { FiCopy, FiEdit2, FiExternalLink, FiEye, FiEyeOff, FiKey, FiShield, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Credential } from "@/types/inventory";
import { ACCESS_POLICY_LABELS, PROTOCOL_LABELS } from "./labels";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Item = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.9rem 1rem;
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
`;

const Meta = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const SecretRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SecretBox = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  padding: 0.35rem 0.6rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  letter-spacing: 0.05em;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-left: auto;
`;

const IconButton = styled.button<{ $danger?: boolean }>`
  background: none;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  cursor: pointer;
  padding: 0.4rem;
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

const NoAccess = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.status.warning};
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const EmptyState = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  border: 1px dashed ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const OpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.tokens.color.interactive.primary};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
  }
`;

// Garante que o link abra como URL absoluta
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface CredentialListProps {
  credentials: Credential[];
  onEdit: (credential: Credential) => void;
  onDelete: (credential: Credential) => void;
  onReveal: (credentialId: string) => Promise<string | null>;
  onManageAccess: (credential: Credential) => void;
}

/**
 * Lista de credenciais do cofre com revelação sob demanda da senha.
 */
export function CredentialList({ credentials, onEdit, onDelete, onReveal, onManageAccess }: CredentialListProps) {
  // Guarda, por credencial, a senha revelada (quando o usuário clica em "ver")
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!credentials.length) {
    return <EmptyState>Nenhuma credencial cadastrada para este equipamento.</EmptyState>;
  }

  // Revela ou esconde a senha de uma credencial
  const toggleReveal = async (credential: Credential) => {
    if (revealed[credential.id]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[credential.id];
        return next;
      });
      return;
    }
    setLoadingId(credential.id);
    try {
      const secret = await onReveal(credential.id);
      if (secret !== null) setRevealed((prev) => ({ ...prev, [credential.id]: secret }));
    } finally {
      setLoadingId(null);
    }
  };

  // Copia a senha revelada para a área de transferência
  const copySecret = async (credentialId: string) => {
    const value = revealed[credentialId];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Silencioso: alguns navegadores bloqueiam clipboard sem HTTPS
    }
  };

  return (
    <List>
      {credentials.map((credential) => {
        const isRevealed = Boolean(revealed[credential.id]);
        return (
          <Item key={credential.id}>
            <Header>
              <TitleWrap>
                <FiKey aria-hidden="true" />
                {credential.label}
              </TitleWrap>
              <Meta>
                {PROTOCOL_LABELS[credential.protocol]}
                {credential.port ? `:${credential.port}` : ""}
                {credential.username ? ` • ${credential.username}` : ""}
              </Meta>
            </Header>

            <SecretRow>
              <SecretBox>{isRevealed ? revealed[credential.id] : credential.secret}</SecretBox>
              {credential.canReveal ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleReveal(credential)}
                    disabled={loadingId === credential.id}
                  >
                    {isRevealed ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    {isRevealed ? "Ocultar" : "Ver senha"}
                  </Button>
                  {isRevealed ? (
                    <IconButton type="button" onClick={() => copySecret(credential.id)} title="Copiar senha">
                      <FiCopy />
                    </IconButton>
                  ) : null}
                </>
              ) : (
                <NoAccess>
                  <FiShield aria-hidden="true" /> Sem permissão para ver a senha
                </NoAccess>
              )}
            </SecretRow>

            <Meta>{ACCESS_POLICY_LABELS[credential.accessPolicy]}</Meta>
            {credential.ownerName ? <Meta>Responsável: {credential.ownerName}</Meta> : null}
            {credential.sharedSecretLabel ? (
              <Meta>Senha padrão do cliente: {credential.sharedSecretLabel}</Meta>
            ) : null}

            <Header>
              <Meta>
                {credential.lastRotatedAt
                  ? `Senha alterada em ${new Date(credential.lastRotatedAt).toLocaleDateString("pt-BR")}`
                  : "Senha nunca alterada"}
              </Meta>
              <Actions>
                {credential.loginUrl ? (
                  <OpenLink
                    href={normalizeUrl(credential.loginUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir link de acesso"
                  >
                    <FiExternalLink aria-hidden="true" /> Abrir
                  </OpenLink>
                ) : null}
                <Button type="button" variant="ghost" onClick={() => onManageAccess(credential)}>
                  Quem pode ver
                </Button>
                <IconButton type="button" onClick={() => onEdit(credential)} title="Editar">
                  <FiEdit2 />
                </IconButton>
                <IconButton type="button" $danger onClick={() => onDelete(credential)} title="Excluir">
                  <FiTrash2 />
                </IconButton>
              </Actions>
            </Header>
          </Item>
        );
      })}
    </List>
  );
}
