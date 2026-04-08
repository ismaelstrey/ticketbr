"use client";

import styled from "styled-components";
import React from "react";
import { ProjectStatus } from "@/types/project";
import { projectStatusLabels } from "@/components/projects/project-constants";

const Pill = styled.span<{ $status: ProjectStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 800;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  ${({ $status, theme }) =>
    $status === "ACTIVE"
      ? `border-color: ${theme.colors.primary}44; background: ${theme.colors.primary}14;`
      : $status === "ARCHIVED"
        ? `opacity: 0.7;`
        : `border-color: ${theme.colors.status.info}44; background: ${theme.colors.status.info}14;`}
`;

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return <Pill $status={status}>{projectStatusLabels[status]}</Pill>;
}

