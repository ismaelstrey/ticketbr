"use client";

import React, { useMemo } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProjectStatus } from "@/types/project";
import { projectStatusLabels, normalizeDateInput } from "@/components/projects/project-constants";

const Grid = styled.div`
  display: grid;
  gap: 12px;
`;

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`;

const ErrorText = styled.div`
  margin-top: 6px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.status.warning};
`;

export type ProjectFormState = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
};

export type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>;

function validate(form: ProjectFormState): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Informe um nome com pelo menos 2 caracteres";
  if (name.length > 180) errors.name = "O nome deve ter no máximo 180 caracteres";
  if (form.description.length > 50_000) errors.description = "A descrição excede 50.000 caracteres";

  const s = normalizeDateInput(form.startDate);
  const e = normalizeDateInput(form.endDate);
  if (s && e && new Date(e) < new Date(s)) errors.endDate = "A data final não pode ser anterior à data inicial";
  return errors;
}

export function ProjectForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel
}: {
  value: ProjectFormState;
  onChange: (next: ProjectFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const errors = useMemo(() => validate(value), [value]);
  const canSubmit = Object.keys(errors).length === 0 && value.name.trim().length >= 2;

  return (
    <Grid>
      <Card style={{ padding: "1rem" }}>
        <TwoCols>
          <div>
            <Label htmlFor="project-name">Nome</Label>
            <Input
              id="project-name"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "project-name-error" : undefined}
              placeholder="Ex.: Implantação ERP"
            />
            {errors.name && <ErrorText id="project-name-error">{errors.name}</ErrorText>}
          </div>
          <div>
            <Label htmlFor="project-status">Status</Label>
            <Select
              id="project-status"
              value={value.status}
              onChange={(e) => onChange({ ...value, status: e.target.value as ProjectStatus })}
            >
              {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((k) => (
                <option key={k} value={k}>
                  {projectStatusLabels[k]}
                </option>
              ))}
            </Select>
          </div>
        </TwoCols>

        <div style={{ marginTop: 12 }}>
          <Label htmlFor="project-description">Descrição</Label>
          <Textarea
            id="project-description"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "project-description-error" : undefined}
            placeholder="Detalhes do escopo, objetivos e observações"
          />
          {errors.description && <ErrorText id="project-description-error">{errors.description}</ErrorText>}
        </div>

        <TwoCols style={{ marginTop: 12 }}>
          <div>
            <Label htmlFor="project-start">Início</Label>
            <Input
              id="project-start"
              type="date"
              value={normalizeDateInput(value.startDate)}
              onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="project-end">Fim</Label>
            <Input
              id="project-end"
              type="date"
              value={normalizeDateInput(value.endDate)}
              onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? "project-end-error" : undefined}
            />
            {errors.endDate && <ErrorText id="project-end-error">{errors.endDate}</ErrorText>}
          </div>
        </TwoCols>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" onClick={onSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </Grid>
  );
}

