"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { FiChevronDown, FiChevronRight, FiExternalLink, FiKey, FiPlus, FiServer } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { InfraTree, InfraTreeNode } from "@/types/inventory";
import {
  CHILD_ADD_LABEL,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_TONE,
  EQUIPMENT_TYPE_LABELS,
  MANAGEMENT_CONTROLLER_LABELS,
  PARENT_CAPABLE_TYPES,
  VIRTUALIZATION_PLATFORM_LABELS
} from "./labels";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SummaryRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SummaryCard = styled.div`
  flex: 1;
  min-width: 140px;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
`;

const SummaryValue = styled.div`
  font-size: 1.4rem;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const SummaryLabel = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const TreeBox = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 0.5rem;
`;

const Row = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  padding-left: ${({ $depth }) => `${0.6 + $depth * 1.4}rem`};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  flex-wrap: wrap;

  &:hover {
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  display: inline-flex;
  align-items: center;
  padding: 0;
  width: 18px;
`;

const ToggleSpacer = styled.span`
  width: 18px;
  display: inline-block;
`;

const NodeButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-size: 0.92rem;

  &:hover {
    color: ${({ theme }) => theme.tokens.color.interactive.primary};
    text-decoration: underline;
  }
`;

const Meta = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const Spacer = styled.span`
  flex: 1;
`;

const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.interactive.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  border: 1px dashed ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: none;
  cursor: pointer;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.interactive.primary};

  &:hover {
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
    border-style: solid;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

// Garante que o link abra como URL absoluta
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface NodeRowProps {
  node: InfraTreeNode;
  depth: number;
  onSelect: (id: string) => void;
  onAddChild: (node: InfraTreeNode) => void;
}

// Renderiza um nó da árvore e seus filhos de forma recursiva
function NodeRow({ node, depth, onSelect, onAddChild }: NodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const canAddChild = PARENT_CAPABLE_TYPES.includes(node.type);

  return (
    <>
      <Row $depth={depth}>
        {hasChildren ? (
          <ToggleButton
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? `Recolher ${node.name}` : `Expandir ${node.name}`}
            aria-expanded={expanded}
          >
            {expanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
          </ToggleButton>
        ) : (
          <ToggleSpacer />
        )}

        <NodeButton type="button" onClick={() => onSelect(node.id)} title="Abrir cadastro do ativo">
          <FiServer aria-hidden="true" />
          {node.name}
        </NodeButton>

        <Badge tone="neutral">{EQUIPMENT_TYPE_LABELS[node.type]}</Badge>
        <Badge tone={EQUIPMENT_STATUS_TONE[node.status]}>{EQUIPMENT_STATUS_LABELS[node.status]}</Badge>

        {node.virtualizationPlatform ? (
          <Meta>{VIRTUALIZATION_PLATFORM_LABELS[node.virtualizationPlatform]}</Meta>
        ) : null}
        {node.vmid !== null ? <Meta>VMID {node.vmid}</Meta> : null}
        {node.ipAddress ? <Meta>{node.ipAddress}</Meta> : null}
        {node.managementIp ? (
          <Meta>
            Gerência {node.managementIp}
            {node.managementController && node.managementController !== "NONE"
              ? ` (${MANAGEMENT_CONTROLLER_LABELS[node.managementController]})`
              : ""}
          </Meta>
        ) : null}
        {node.credentialCount > 0 ? (
          <Meta>
            <FiKey aria-hidden="true" /> {node.credentialCount}
          </Meta>
        ) : null}

        <Spacer />

        {canAddChild ? (
          <AddButton
            type="button"
            onClick={() => onAddChild(node)}
            title={`Adicionar um recurso dentro de ${node.name}`}
          >
            <FiPlus aria-hidden="true" /> {CHILD_ADD_LABEL[node.type]}
          </AddButton>
        ) : null}

        {node.url ? (
          <LinkButton href={normalizeUrl(node.url)} target="_blank" rel="noopener noreferrer">
            <FiExternalLink aria-hidden="true" /> Abrir
          </LinkButton>
        ) : null}
      </Row>

      {hasChildren && expanded
        ? node.children.map((child) => (
            <NodeRow key={child.id} node={child} depth={depth + 1} onSelect={onSelect} onAddChild={onAddChild} />
          ))
        : null}
    </>
  );
}

interface InfraTreeViewProps {
  tree: InfraTree;
  onSelect: (id: string) => void;
  onAddChild: (node: InfraTreeNode) => void;
}

/**
 * Árvore de infraestrutura (host -> VM -> container) com resumo, links de acesso
 * e atalho para adicionar recursos dentro de um host.
 */
export function InfraTreeView({ tree, onSelect, onAddChild }: InfraTreeViewProps) {
  return (
    <Wrapper>
      <SummaryRow>
        <SummaryCard>
          <SummaryValue>{tree.summary.hosts}</SummaryValue>
          <SummaryLabel>Hosts de virtualização</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{tree.summary.vms}</SummaryValue>
          <SummaryLabel>Máquinas virtuais</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{tree.summary.containers}</SummaryValue>
          <SummaryLabel>Containers</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{tree.summary.managedHosts}</SummaryValue>
          <SummaryLabel>Hosts com gerência fora de banda</SummaryLabel>
        </SummaryCard>
      </SummaryRow>

      <TreeBox>
        {tree.nodes.length ? (
          tree.nodes.map((node) => (
            <NodeRow key={node.id} node={node} depth={0} onSelect={onSelect} onAddChild={onAddChild} />
          ))
        ) : (
          <EmptyState>Nenhum servidor, host ou recurso virtualizado cadastrado para este cliente.</EmptyState>
        )}
      </TreeBox>
    </Wrapper>
  );
}
