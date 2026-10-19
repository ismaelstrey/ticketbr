"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { Project } from "@/types/project";
import { ProjectStatusPill } from "@/components/projects/ProjectStatusPill";

type StaffUser = { id: string; name: string; email: string; role: string };

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

// Rótulo em português para o papel do membro
function roleLabel(role: string) {
  if (role === "owner") return "Dono";
  if (role === "viewer") return "Visualizador";
  return "Membro";
}

const selectStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "transparent",
  fontWeight: 700
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Carrega os dados do projeto a partir da API
  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.get(id);
      setProject(res.data as Project);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar projeto");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  // Carrega a lista de usuários staff disponíveis para compor o projeto
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.tasks.assignees();
        if (active) setStaff(res.data || []);
      } catch {
        if (active) setStaff([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  // Adiciona um membro ao projeto e recarrega os dados
  const addMember = async () => {
    if (!project || !newUserId) return;
    setMemberBusy(true);
    setMemberError(null);
    try {
      await api.projects.members.add(project.id, { userId: newUserId, role: newRole });
      setNewUserId("");
      setNewRole("member");
      await loadProject();
    } catch (err: any) {
      setMemberError(err.message || "Falha ao adicionar membro");
    } finally {
      setMemberBusy(false);
    }
  };

  // Altera o papel de um membro existente
  const changeRole = async (memberId: string, role: string) => {
    if (!project) return;
    setMemberBusy(true);
    setMemberError(null);
    try {
      await api.projects.members.update(project.id, memberId, { role });
      await loadProject();
    } catch (err: any) {
      setMemberError(err.message || "Falha ao atualizar membro");
    } finally {
      setMemberBusy(false);
    }
  };

  // Remove um membro do projeto
  const removeMember = async (memberId: string) => {
    if (!project) return;
    setMemberBusy(true);
    setMemberError(null);
    try {
      await api.projects.members.remove(project.id, memberId);
      await loadProject();
    } catch (err: any) {
      setMemberError(err.message || "Falha ao remover membro");
    } finally {
      setMemberBusy(false);
    }
  };

  const members = project?.members || [];
  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableStaff = staff.filter((u) => !memberUserIds.has(u.id));

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

              <Card style={{ padding: "1rem" }} aria-label="Membros do projeto">
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Membros</div>

                {memberError && (
                  <div role="alert" style={{ marginBottom: 10, fontWeight: 700, color: "#c62828" }}>
                    {memberError}
                  </div>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                  {members.length > 0 ? (
                    members.map((m) => (
                      <div
                        key={m.id}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{m.user?.name || m.userId}</div>
                          <div style={{ opacity: 0.7, fontSize: 13 }}>{m.user?.email || ""}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {m.role === "owner" ? (
                            <span style={{ fontSize: 12, fontWeight: 900, padding: "2px 10px", borderRadius: 999, background: "rgba(0,0,0,0.08)" }}>
                              {roleLabel(m.role)}
                            </span>
                          ) : (
                            <>
                              <select
                                aria-label={`Papel de ${m.user?.name || m.userId}`}
                                value={m.role}
                                onChange={(e) => changeRole(m.id, e.target.value)}
                                disabled={memberBusy}
                                style={selectStyle}
                              >
                                <option value="member">Membro</option>
                                <option value="viewer">Visualizador</option>
                              </select>
                              <Button type="button" variant="ghost" onClick={() => removeMember(m.id)} disabled={memberBusy}>
                                Remover
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>Nenhum membro cadastrado.</div>
                  )}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    aria-label="Selecionar usuário"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    disabled={memberBusy}
                    style={{ ...selectStyle, minWidth: 220 }}
                  >
                    <option value="">Selecione um usuário</option>
                    {availableStaff.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Selecionar papel"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    disabled={memberBusy}
                    style={selectStyle}
                  >
                    <option value="member">Membro</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <Button type="button" onClick={addMember} disabled={memberBusy || !newUserId}>
                    Adicionar
                  </Button>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </MainContent>
    </AppShellContainer>
  );
}
