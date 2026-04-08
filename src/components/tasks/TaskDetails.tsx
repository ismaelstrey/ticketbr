"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Task, TaskPriority, TaskStatus } from "@/types/task";
import { taskPriorityLabels, taskStatusLabels, getDueState } from "@/components/tasks/task-constants";
import { formatDateTimePtBR } from "@/components/tasks/task-format";
import { SubtasksPanel, Subtask } from "@/components/tasks/SubtasksPanel";
import { AttachmentsPanel, TaskAttachmentMeta } from "@/components/tasks/AttachmentsPanel";
import { TicketLinksPanel, TaskTicketLink } from "@/components/tasks/TicketLinksPanel";
import { HeaderRow, Label, Layout, Title } from "@/components/tasks/TaskDetailsLayout";
import { useTaskDetail } from "@/hooks/useTaskDetail";

export default function TaskDetails() {
  const router = useRouter();
  const params = useParams();
  const taskId = String((params as any)?.id || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { task, assignees, loading, saving, uploading, error, form, setForm, dueState, actions } = useTaskDetail(taskId);

  if (loading) {
    return (
      <AppShellContainer>
        <Sidebar />
        <MainContent>
          <div style={{ padding: "1rem", opacity: 0.8 }}>Carregando...</div>
        </MainContent>
      </AppShellContainer>
    );
  }

  if (!task) {
    return (
      <AppShellContainer>
        <Sidebar />
        <MainContent>
          <Card style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Tarefa não encontrada</div>
            <div style={{ opacity: 0.8 }}>{error || ""}</div>
            <div style={{ marginTop: 10 }}>
              <Button type="button" variant="ghost" onClick={() => router.push("/tasks")}>
                Voltar
              </Button>
            </div>
          </Card>
        </MainContent>
      </AppShellContainer>
    );
  }

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <HeaderRow>
          <div>
            <Title>#{task.id.slice(0, 6)} · {task.title}</Title>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Atualizado em {formatDateTimePtBR(task.updatedAt)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" variant="ghost" onClick={() => router.push("/tasks")}>
              Voltar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)}>
              Excluir
            </Button>
            <Button type="button" variant="primary" onClick={actions.save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </HeaderRow>

        <Layout>
          <div style={{ display: "grid", gap: 12 }}>
            <Card style={{ padding: "1rem" }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Descrição detalhada</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
              </div>
            </Card>

            <SubtasksPanel
              subtasks={(task.subtasks || []) as Subtask[]}
              loading={saving}
              onCreate={actions.createSubtask}
              onToggle={actions.toggleSubtask}
              onRemove={actions.removeSubtask}
            />

            <AttachmentsPanel
              attachments={(task.attachments || []) as TaskAttachmentMeta[]}
              uploading={uploading}
              onUpload={actions.uploadAttachment}
              onRemove={actions.removeAttachment}
            />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <Card style={{ padding: "1rem" }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Detalhes</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as TaskStatus }))}>
                    {(Object.keys(taskStatusLabels) as TaskStatus[]).map((key) => (
                      <option key={key} value={key}>
                        {taskStatusLabels[key]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value as TaskPriority }))}>
                    {(Object.keys(taskPriorityLabels) as TaskPriority[]).map((key) => (
                      <option key={key} value={key}>
                        {taskPriorityLabels[key]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Responsável</Label>
                  <Select value={form.assigneeId} onChange={(e) => setForm((s) => ({ ...s, assigneeId: e.target.value }))}>
                    <option value="">Não atribuído</option>
                    {assignees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Data de vencimento</Label>
                  <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((s) => ({ ...s, dueAt: e.target.value }))} />
                  {dueState === "overdue" ? <div style={{ marginTop: 6, color: "#F87171", fontSize: 13, fontWeight: 800 }}>Atrasada</div> : null}
                  {dueState === "soon" ? <div style={{ marginTop: 6, color: "#FBBF24", fontSize: 13, fontWeight: 800 }}>Vencendo em 24h</div> : null}
                </div>
              </div>
            </Card>

            <TicketLinksPanel
              links={(task.ticketLinks || []) as TaskTicketLink[]}
              onAdd={actions.addTicketLink}
              onRemove={actions.removeTicketLink}
            />
          </div>
        </Layout>

        <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir tarefa">
          <div style={{ display: "grid", gap: 12 }}>
            <div>Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={async () => {
                  await actions.remove();
                  router.push("/tasks");
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      </MainContent>
    </AppShellContainer>
  );
}
