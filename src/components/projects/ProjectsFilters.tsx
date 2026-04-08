"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ProjectStatus } from "@/types/project";
import { projectStatusLabels } from "@/components/projects/project-constants";

const FiltersGrid = styled(Card)`
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 0.35rem;
  display: block;
`;

export type ProjectsFiltersState = {
  q: string;
  status: "" | ProjectStatus;
  ownerUserId: string;
  startDateFrom: string;
  endDateTo: string;
};

export function ProjectsFilters({
  value,
  owners,
  onChange,
  onApply,
  onReset,
  applying
}: {
  value: ProjectsFiltersState;
  owners: Array<{ id: string; name: string }>;
  onChange: (next: ProjectsFiltersState) => void;
  onApply: () => void;
  onReset: () => void;
  applying?: boolean;
}) {
  return (
    <FiltersGrid aria-label="Filtros de projetos">
      <div>
        <Label htmlFor="projects-q">Busca</Label>
        <Input
          id="projects-q"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="Nome ou descrição"
        />
      </div>

      <div>
        <Label htmlFor="projects-status">Status</Label>
        <Select
          id="projects-status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as any })}
        >
          <option value="">Todos</option>
          {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((k) => (
            <option key={k} value={k}>
              {projectStatusLabels[k]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="projects-owner">Responsável</Label>
        <Select
          id="projects-owner"
          value={value.ownerUserId}
          onChange={(e) => onChange({ ...value, ownerUserId: e.target.value })}
        >
          <option value="">Todos</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="projects-start">Início (de)</Label>
        <Input
          id="projects-start"
          type="date"
          value={value.startDateFrom}
          onChange={(e) => onChange({ ...value, startDateFrom: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="projects-end">Fim (até)</Label>
        <Input
          id="projects-end"
          type="date"
          value={value.endDateTo}
          onChange={(e) => onChange({ ...value, endDateTo: e.target.value })}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Button type="button" variant="ghost" onClick={onReset} disabled={applying}>
          Limpar
        </Button>
        <Button type="button" variant="primary" onClick={onApply} disabled={applying}>
          {applying ? "Aplicando..." : "Aplicar"}
        </Button>
      </div>
    </FiltersGrid>
  );
}

