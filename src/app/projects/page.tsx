"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/FeedbackState";
import { api } from "@/services/api";
import { Project } from "@/types/project";
import { ProjectsFilters, ProjectsFiltersState } from "@/components/projects/ProjectsFilters";
import { ProjectsTable } from "@/components/projects/ProjectsTable";

const Page = styled.div`
  padding: 1rem;
  display: grid;
  gap: 12px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Sub = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.92rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

function spToState(sp: URLSearchParams): ProjectsFiltersState {
  return {
    q: sp.get("q") ?? "",
    status: (sp.get("status") as any) ?? "",
    ownerUserId: sp.get("ownerUserId") ?? "",
    startDateFrom: sp.get("startDateFrom") ?? "",
    endDateTo: sp.get("endDateTo") ?? ""
  };
}

function stateToParams(state: ProjectsFiltersState) {
  const params: Record<string, string> = {};
  if (state.q.trim()) params.q = state.q.trim();
  if (state.status) params.status = state.status;
  if (state.ownerUserId) params.ownerUserId = state.ownerUserId;
  if (state.startDateFrom) params.startDateFrom = state.startDateFrom;
  if (state.endDateTo) params.endDateTo = state.endDateTo;
  return params;
}

export default function ProjectsListPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <Page>
            <HeaderRow>
              <div>
                <Title>Projetos</Title>
                <Sub>Atualizando dados...</Sub>
              </div>
            </HeaderRow>
            <LoadingState
              title="Carregando projetos"
              description="Estamos preparando sua visão de projetos."
            />
          </Page>
        </AppLayout>
      }
    >
      <ProjectsListInner />
    </Suspense>
  );
}

function ProjectsListInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [filters, setFilters] = useState<ProjectsFiltersState>(() => spToState(sp));

  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentParams = useMemo(() => stateToParams(filters), [filters]);

  const loadOwners = useCallback(async () => {
    try {
      const list = await api.users.list();
      const normalized = (Array.isArray(list) ? list : []).map((u: any) => ({
        id: String(u.id),
        name: String(u.name || u.email || u.id)
      }));
      setOwners(normalized);
    } catch {
      setOwners([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.list({
        ...currentParams,
        page: sp.get("page") ?? "1",
        pageSize: sp.get("pageSize") ?? "20"
      });
      setProjects(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar projetos");
      setProjects([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [currentParams, sp]);

  useEffect(() => {
    setFilters(spToState(sp));
  }, [sp]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async () => {
    setApplying(true);
    try {
      const params = new URLSearchParams(stateToParams(filters));
      router.push(`/projects?${params.toString()}`);
    } finally {
      setApplying(false);
    }
  };

  const reset = () => {
    const next: ProjectsFiltersState = {
      q: "",
      status: "",
      ownerUserId: "",
      startDateFrom: "",
      endDateTo: ""
    };
    setFilters(next);
    router.push("/projects");
  };

  return (
    <AppLayout>
      <Page>
        <HeaderRow>
          <div>
            <Title>Projetos</Title>
            <Sub>{meta ? `${meta.total} registro(s)` : ""}</Sub>
          </div>
          <HeaderActions>
            <Button type="button" variant="ghost" onClick={() => router.push("/projects/dashboard")}>
              Dashboard
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/projects/reports")}>
              Relatórios
            </Button>
            <Button type="button" variant="primary" onClick={() => router.push("/projects/new")}>
              Novo projeto
            </Button>
          </HeaderActions>
        </HeaderRow>

        <ProjectsFilters
          value={filters}
          owners={owners}
          onChange={setFilters}
          onApply={apply}
          onReset={reset}
          applying={applying}
        />

        {error ? (
          <ErrorState
            title="Erro ao carregar projetos"
            description={error}
            actionLabel="Tentar novamente"
            onAction={load}
          />
        ) : (
          <ProjectsTable projects={projects} loading={loading} onOpen={(id) => router.push(`/projects/${id}`)} />
        )}
      </Page>
    </AppLayout>
  );
}
