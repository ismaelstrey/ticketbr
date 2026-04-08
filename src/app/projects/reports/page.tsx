"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { api } from "@/services/api";

const Layout = styled.div`
  padding: 1rem;
  display: grid;
  gap: 12px;
`;

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
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

type ExportFormat = "csv" | "xlsx" | "json";

export default function ProjectsReportsPage() {
  const router = useRouter();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [endDateTo, setEndDateTo] = useState("");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);

  const payload = useMemo(() => {
    const query: any = {};
    if (q.trim()) query.q = q.trim();
    if (status) query.status = status;
    if (startDateFrom) query.startDateFrom = startDateFrom;
    if (endDateTo) query.endDateTo = endDateTo;
    return { format, query };
  }, [format, q, status, startDateFrom, endDateTo]);

  const runExport = async () => {
    setRunning(true);
    setError(null);
    setPreview(null);
    try {
      const res = await api.projects.export(payload);
      if (!res.ok) {
        const body = await res.json().catch(() => null as any);
        const msg = body?.error ? String(body.error) : `Falha ao exportar (${res.status})`;
        throw new Error(msg);
      }

      const contentType = String(res.headers.get("content-type") || "");
      if (contentType.includes("application/json")) {
        const json = await res.json();
        setPreview(Array.isArray(json?.data) ? json.data.slice(0, 50) : []);
        return;
      }

      const blob = await res.blob();
      const name = (() => {
        const cd = res.headers.get("content-disposition") || "";
        const m = /filename=\"([^\"]+)\"/i.exec(cd);
        return m?.[1] || `projetos_export.${format}`;
      })();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Falha ao exportar");
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Layout>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>Relatórios · Projetos</div>
              <div style={{ opacity: 0.75 }}>Gere exportações com filtros e formatos diferentes.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="button" variant="ghost" onClick={() => router.push("/projects")}>Voltar</Button>
              <Button type="button" variant="primary" onClick={runExport} disabled={running}>
                {running ? "Exportando..." : "Gerar e baixar"}
              </Button>
            </div>
          </div>

          {error && (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          )}

          <TwoCols>
            <Card style={{ padding: "1rem" }} aria-label="Configuração do relatório">
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Configuração</div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <Label htmlFor="projects-report-q">Busca</Label>
                  <Input id="projects-report-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou descrição" />
                </div>

                <div>
                  <Label htmlFor="projects-report-status">Status</Label>
                  <Select id="projects-report-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="projects-report-start">Início (de)</Label>
                  <Input id="projects-report-start" type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="projects-report-end">Fim (até)</Label>
                  <Input id="projects-report-end" type="date" value={endDateTo} onChange={(e) => setEndDateTo(e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="projects-report-format">Formato</Label>
                  <Select id="projects-report-format" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
                    <option value="csv">CSV</option>
                    <option value="xlsx">XLSX</option>
                    <option value="json">JSON (preview)</option>
                  </Select>
                </div>
              </div>
            </Card>

            <Card style={{ padding: "1rem" }} aria-label="Pré-visualização">
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Pré-visualização</div>
              {running ? (
                <div style={{ opacity: 0.75 }}>Gerando...</div>
              ) : preview ? (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, opacity: 0.9 }}>
                  {JSON.stringify(preview, null, 2)}
                </pre>
              ) : (
                <div style={{ opacity: 0.75 }}>Use JSON para ver uma amostra antes de exportar CSV/XLSX.</div>
              )}
            </Card>
          </TwoCols>
        </Layout>
      </MainContent>
    </AppShellContainer>
  );
}

