"use client";

import React from "react";
import styled from "styled-components";
import { FiEdit2, FiExternalLink, FiTrash2 } from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";
import { Equipment } from "@/types/inventory";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_TONE, EQUIPMENT_TYPE_LABELS } from "./labels";

const Wrapper = styled.div`
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

const Th = styled.th`
  padding: 0.75rem 1.25rem;
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
`;

const Td = styled.td`
  padding: 0.7rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: 0.9rem;
  vertical-align: middle;
`;

const NameButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-size: 0.92rem;

  &:hover {
    color: ${({ theme }) => theme.tokens.color.interactive.primary};
    text-decoration: underline;
  }
`;

const SubText = styled.div`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.78rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
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

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

interface EquipmentTableProps {
  equipment: Equipment[];
  loading: boolean;
  onOpen: (id: string) => void;
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
}

/**
 * Tabela de equipamentos com ações de abrir, editar e excluir.
 */
export function EquipmentTable({ equipment, loading, onOpen, onEdit, onDelete }: EquipmentTableProps) {
  if (loading) return <Wrapper><LoadingState>Carregando...</LoadingState></Wrapper>;
  if (!equipment.length) return <Wrapper><EmptyState>Nenhum equipamento encontrado.</EmptyState></Wrapper>;

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <Th>Equipamento</Th>
            <Th>Tipo</Th>
            <Th>Status</Th>
            <Th>IP</Th>
            <Th>Localização</Th>
            <Th>Credenciais</Th>
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item) => (
            <tr key={item.id}>
              <Td>
                <NameButton type="button" onClick={() => onOpen(item.id)}>
                  {item.name}
                </NameButton>
                {item.code ? <SubText>{item.code}</SubText> : null}
              </Td>
              <Td>{EQUIPMENT_TYPE_LABELS[item.type]}</Td>
              <Td>
                <Badge tone={EQUIPMENT_STATUS_TONE[item.status]}>{EQUIPMENT_STATUS_LABELS[item.status]}</Badge>
              </Td>
              <Td>{item.ipAddress || "—"}</Td>
              <Td>{item.location || "—"}</Td>
              <Td>{item.credentialCount ?? 0}</Td>
              <Td>
                <Actions>
                  <IconButton type="button" onClick={() => onOpen(item.id)} title="Abrir">
                    <FiExternalLink />
                  </IconButton>
                  <IconButton type="button" onClick={() => onEdit(item)} title="Editar">
                    <FiEdit2 />
                  </IconButton>
                  <IconButton type="button" $danger onClick={() => onDelete(item)} title="Excluir">
                    <FiTrash2 />
                  </IconButton>
                </Actions>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}
