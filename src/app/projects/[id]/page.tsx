"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { Project } from "@/types/project";
import { ProjectStatusPill } from "@/components/projects/ProjectStatusPill";

function datePt(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

function dateTimePt(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.projects.get(id);
        if (!active) return;
        setProject(res.data as Project);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || "Falha ao carregar projeto");
        setProject(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const remove = async () => {
    if (!project) return;
    const ok = window.confirm(`Excluir o projeto "${project.name}"?`);
    if (!ok) return;
    try {
      await api.projects.remove(project.id);
      router.push("/projects");
    } catch (err: any) {
      setError(err.message || "Falha ao excluir");
    }
  };

  const archiveToggle = async () => {
    if (!project) return;
    const next = project.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    try {
      const res = await api.projects.update(project.id, { status: next });
      setProject(res.data as any);
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar");
    }
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <div style={{ padding: "1rem", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>
                Projeto
              </div>
              <div style={{ opacity: 0.75 }}>{loading ? "Carregando..." : project ? `Atualizado em ${dateTimePt(project.updatedAt)}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="button" variant="ghost" onClick={() => router.push("/projects")}>Voltar</Button>
              {project && (
                <>
                  <Button type="button" variant="ghost" onClick={() => router.push(`/projects/${project.id}/edit`)}>Editar</Button>
                  <Button type="button" variant="ghost" onClick={archiveToggle}>{project.status === "ARCHIVED" ? "Reativar" : "Arquivar"}</Button>
                  <Button type="button" variant="ghost" onClick={remove}>Excluir</Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          )}

          {!loading && !project ? (
            <Card style={{ padding: "1rem" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Projeto não encontrado</div>
              <div style={{ opacity: 0.8 }}>{error || ""}</div>
            </Card>
          ) : project ? (
            <>
              <Card style={{ padding: "1rem" }} aria-label="Resumo do projeto">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>{project.name}</div>
                    <div style={{ opacity: 0.8 }}>{project.description || ""}</div>
                  </div>
                  <ProjectStatusPill status={project.status} />
                </div>
              </Card>

              <Card style={{ padding: "1rem" }} aria-label="Detalhes do projeto">
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                    <div style={{ opacity: 0.75 }}>Responsável</div>
                    <div style={{ fontWeight: 800 }}>{project.ownerUser?.name || ""}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                    <div style={{ opacity: 0.75 }}>Início</div>
                    <div style={{ fontWeight: 800 }}>{datePt(project.startDate) || "—"}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                    <div style={{ opacity: 0.75 }}>Fim</div>
                    <div style={{ fontWeight: 800 }}>{datePt(project.endDate) || "—"}</div>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </MainContent>
    </AppShellContainer>
  );
}

