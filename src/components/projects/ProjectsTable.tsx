"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Project } from "@/types/project";
import { ProjectStatusPill } from "@/components/projects/ProjectStatusPill";
import { FiChevronRight } from "@/components/icons";

const TableCard = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.92rem;
  vertical-align: middle;
`;

const NameCell = styled.div`
  display: grid;
  gap: 4px;
`;

const Name = styled.div`
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Sub = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
`;

const Empty = styled.div`
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

function toDatePt(dateIso: string | null | undefined) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function ProjectsTable({
  projects,
  loading,
  onOpen
}: {
  projects: Project[];
  loading?: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <TableCard aria-label="Tabela de projetos">
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th scope="col">Projeto</Th>
              <Th scope="col">Status</Th>
              <Th scope="col">Responsável</Th>
              <Th scope="col">Início</Th>
              <Th scope="col">Fim</Th>
              <Th scope="col" style={{ textAlign: "right" }}>
                Ações
              </Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6}>Carregando...</Td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <Td colSpan={6}>
                  <Empty>Nenhum projeto encontrado.</Empty>
                </Td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <NameCell>
                      <Name>{p.name}</Name>
                      <Sub title={p.description ?? ""}>{p.description ?? ""}</Sub>
                    </NameCell>
                  </Td>
                  <Td>
                    <ProjectStatusPill status={p.status} />
                  </Td>
                  <Td>{p.ownerUser?.name ?? ""}</Td>
                  <Td>{toDatePt(p.startDate)}</Td>
                  <Td>{toDatePt(p.endDate)}</Td>
                  <Td style={{ textAlign: "right" }}>
                    <Button type="button" variant="ghost" onClick={() => onOpen(p.id)} aria-label={`Abrir ${p.name}`}>
                      <FiChevronRight aria-hidden="true" />
                      Abrir
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </TableCard>
  );
}

