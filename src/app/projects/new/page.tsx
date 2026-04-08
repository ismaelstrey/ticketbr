"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { ProjectForm, ProjectFormState } from "@/components/projects/ProjectForm";
import { api } from "@/services/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>({
    name: "",
    description: "",
    status: "ACTIVE",
    startDate: "",
    endDate: ""
  });

  const submit = async () => {
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
      const res = await api.projects.create(payload);
      router.push(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || "Falha ao criar projeto");
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
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>Novo projeto</div>
            <div style={{ opacity: 0.75 }}>Cadastre um projeto e comece a acompanhar pelo dashboard.</div>
          </Card>

          {error && (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          )}

          <ProjectForm
            value={form}
            onChange={setForm}
            onSubmit={submit}
            onCancel={() => router.push("/projects")}
            submitting={saving}
            submitLabel="Criar"
          />
        </div>
      </MainContent>
    </AppShellContainer>
  );
}

