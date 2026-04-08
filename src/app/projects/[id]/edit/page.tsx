"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { Project } from "@/types/project";
import { ProjectForm, ProjectFormState } from "@/components/projects/ProjectForm";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormState>({
    name: "",
    description: "",
    status: "ACTIVE",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.projects.get(id);
        if (!active) return;
        const p = res.data as Project;
        setProject(p);
        setForm({
          name: p.name,
          description: p.description ?? "",
          status: p.status,
          startDate: p.startDate ? p.startDate.slice(0, 10) : "",
          endDate: p.endDate ? p.endDate.slice(0, 10) : ""
        });
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

  const submit = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description.trim() ? form.description.trim() : null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null
      };
      const res = await api.projects.update(project.id, payload);
      router.push(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <div style={{ padding: "1rem", display: "grid", gap: 12 }}>
          <Card style={{ padding: "1rem" }}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>Editar projeto</div>
            <div style={{ opacity: 0.75 }}>{loading ? "Carregando..." : project ? project.name : ""}</div>
          </Card>

          {error && (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          )}

          {loading ? (
            <Card style={{ padding: "1rem", opacity: 0.8 }}>Carregando...</Card>
          ) : !project ? (
            <Card style={{ padding: "1rem" }}>Projeto não encontrado.</Card>
          ) : (
            <ProjectForm
              value={form}
              onChange={setForm}
              onSubmit={submit}
              onCancel={() => router.push(`/projects/${project.id}`)}
              submitting={saving}
              submitLabel="Salvar"
            />
          )}
        </div>
      </MainContent>
    </AppShellContainer>
  );
}

