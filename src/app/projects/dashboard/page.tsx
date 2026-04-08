"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { ProjectStatusPill } from "@/components/projects/ProjectStatusPill";

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

const KpiGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(Card)`
  padding: 1rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const KpiValue = styled.div`
  font-size: 1.6rem;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const KpiLabel = styled.div`
  margin-top: 6px;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

function formatDateTimePt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const kpis = data?.kpis ?? null;
  const recent = (data?.recent ?? []) as Array<{ id: string; name: string; status: any; updatedAt: string }>;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.projects.dashboard();
        if (!active) return;
        setData(res.data);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || "Falha ao carregar dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      { key: "total", label: "Total", value: kpis.total, to: "/projects" },
      { key: "active", label: "Ativos", value: kpis.active, to: "/projects?status=ACTIVE" },
      { key: "draft", label: "Rascunhos", value: kpis.draft, to: "/projects?status=DRAFT" },
      { key: "endingSoon", label: "Vencendo (7 dias)", value: kpis.endingSoon, to: "/projects" }
    ];
  }, [kpis]);

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Page>
          <HeaderRow>
            <div>
              <Title>Projetos · Dashboard</Title>
              <div style={{ marginTop: 6, color: "rgba(148,163,184,0.9)" }}>Visão rápida e atalhos.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="button" variant="ghost" onClick={() => router.push("/projects")}>Ver todos</Button>
              <Button type="button" variant="primary" onClick={() => router.push("/projects/new")}>Novo projeto</Button>
            </div>
          </HeaderRow>

          {error ? (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          ) : (
            <>
              <KpiGrid aria-label="KPIs de projetos">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <Card key={idx} style={{ padding: "1rem", opacity: 0.75 }}>Carregando...</Card>
                  ))
                ) : (
                  cards.map((c) => (
                    <KpiCard key={c.key} role="button" tabIndex={0} onClick={() => router.push(c.to)}>
                      <KpiValue>{c.value}</KpiValue>
                      <KpiLabel>{c.label}</KpiLabel>
                    </KpiCard>
                  ))
                )}
              </KpiGrid>

              <Card style={{ padding: "1rem" }} aria-label="Projetos recentes">
                <div style={{ fontWeight: 950, marginBottom: 10, color: "inherit" }}>Recentes</div>
                {loading ? (
                  <div style={{ opacity: 0.75 }}>Carregando...</div>
                ) : recent.length === 0 ? (
                  <div style={{ opacity: 0.75 }}>Nenhum projeto recente.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recent.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/projects/${p.id}`)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          border: "1px solid rgba(148,163,184,0.2)",
                          background: "transparent",
                          borderRadius: 12,
                          padding: "0.8rem",
                          cursor: "pointer",
                          color: "inherit"
                        }}
                      >
                        <div style={{ display: "grid", gap: 4, textAlign: "left" }}>
                          <div style={{ fontWeight: 900 }}>{p.name}</div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>Atualizado em {formatDateTimePt(p.updatedAt)}</div>
                        </div>
                        <ProjectStatusPill status={p.status} />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </Page>
      </MainContent>
    </AppShellContainer>
  );
}

