import { Ticket, TicketStatus } from "@/types/ticket";
import { Task, TaskComment } from "@/types/task";
import { Project, ProjectMember } from "@/types/project";
import { TicketOperationalDashboardResponse, TicketDashboardFilters } from "@/types/ticketsDashboard";
import { Credential, CredentialGrant, Equipment, UserGroup } from "@/types/inventory";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => null as any);
    const message =
      (body && typeof body.error === "string" && body.error.trim())
        ? body.error.trim()
        : `API Error: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  tickets: {
    list: () => fetchJson<{ data: Ticket[] }>("/tickets"),
    get: (id: string) => fetchJson<{ data: Ticket }>(`/tickets/${id}`),
    update: (id: string, data: Partial<Ticket>) => fetchJson<{ data: Ticket }>(`/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
    }),
    updateStatus: (id: string, status: TicketStatus, reason?: string, pauseSla?: boolean) => 
        fetchJson<{ data: Ticket }>(`/tickets/${id}/status`, {
            method: "POST",
            body: JSON.stringify({ status, pauseReason: reason, pauseSla })
        }),
    lookups: () => fetchJson<{ data: {
      tipos: Array<{ id: string; nome: string }>;
      categorias: Array<{ id: string; nome: string; tipo_ticket_id: string }>;
      mesas: Array<{ id: string; nome: string }>;
      operadores: Array<{ id: string; nome: string }>;
    } }>("/tickets/lookups")
  },
  users: {
      list: () => fetchJson<any[]>("/users")
  },
  tasks: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return fetchJson<{ data: Task[] }>(`/tasks${qs}`);
    },
    get: (id: string) => fetchJson<{ data: any }>(`/tasks/${id}`),
    create: (payload: any) => fetchJson<{ data: any }>("/tasks", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) => fetchJson<{ data: any }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id: string) => fetchJson<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),
    move: (id: string, payload: { status: string; beforeId?: string | null }) =>
      fetchJson<{ data: any }>(`/tasks/${id}/move`, { method: "PATCH", body: JSON.stringify(payload) }),
    assignees: () => fetchJson<{ data: Array<{ id: string; name: string; email: string; role: string }> }>("/tasks/assignees"),
    subtasks: {
      list: (taskId: string) => fetchJson<{ data: any[] }>(`/tasks/${taskId}/subtasks`),
      create: (taskId: string, payload: any) => fetchJson<{ data: any }>(`/tasks/${taskId}/subtasks`, { method: "POST", body: JSON.stringify(payload) }),
      update: (taskId: string, subtaskId: string, payload: any) => fetchJson<{ data: any }>(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: "PATCH", body: JSON.stringify(payload) }),
      remove: (taskId: string, subtaskId: string) => fetchJson<{ ok: boolean }>(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
    },
    tickets: {
      list: (taskId: string) => fetchJson<{ data: any[] }>(`/tasks/${taskId}/tickets`),
      add: (taskId: string, payload: any) => fetchJson<{ data: any }>(`/tasks/${taskId}/tickets`, { method: "POST", body: JSON.stringify(payload) }),
      remove: (taskId: string, linkId: string) => fetchJson<{ ok: boolean }>(`/tasks/${taskId}/tickets/${linkId}`, { method: "DELETE" })
    },
    attachments: {
      list: (taskId: string) => fetchJson<{ data: any[] }>(`/tasks/${taskId}/attachments`),
      upload: (taskId: string, payload: any) => fetchJson<{ data: any }>(`/tasks/${taskId}/attachments`, { method: "POST", body: JSON.stringify(payload) }),
      remove: (attachmentId: string) => fetchJson<{ ok: boolean }>(`/tasks/attachments/${attachmentId}`, { method: "DELETE" })
    },
    comments: {
      list: (taskId: string) => fetchJson<{ data: TaskComment[] }>(`/tasks/${taskId}/comments`),
      create: (taskId: string, payload: { body: string }) => fetchJson<{ data: TaskComment }>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
      remove: (taskId: string, commentId: string) => fetchJson<{ ok: boolean }>(`/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" })
    }
  }
  ,
  projects: {
    dashboard: () => fetchJson<{ data: { kpis: any; recent: any[] } }>("/projects/dashboard"),
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return fetchJson<{ data: Project[]; meta: { total: number; page: number; pageSize: number } }>(`/projects${qs}`);
    },
    get: (id: string) => fetchJson<{ data: any }>(`/projects/${id}`),
    create: (payload: any) => fetchJson<{ data: Project }>("/projects", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) => fetchJson<{ data: Project }>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id: string) => fetchJson<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),
    members: {
      list: (projectId: string) => fetchJson<{ data: ProjectMember[] }>(`/projects/${projectId}/members`),
      add: (projectId: string, payload: { userId: string; role?: string }) =>
        fetchJson<{ data: ProjectMember }>(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(payload) }),
      update: (projectId: string, memberId: string, payload: { role: string }) =>
        fetchJson<{ data: ProjectMember }>(`/projects/${projectId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(payload) }),
      remove: (projectId: string, memberId: string) =>
        fetchJson<{ ok: boolean }>(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" })
    },
    export: (payload: any) => fetch(`${API_BASE}/projects/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  },
  inventory: {
    // Equipamentos
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return fetchJson<{ data: Equipment[]; total: number; page: number; pageSize: number }>(`/inventory${qs}`);
    },
    get: (id: string) => fetchJson<{ data: Equipment & { credentials: Credential[] } }>(`/inventory/${id}`),
    create: (payload: Partial<Equipment>) =>
      fetchJson<{ data: Equipment }>("/inventory", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Equipment>) =>
      fetchJson<{ data: Equipment }>(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id: string) => fetchJson<{ ok: boolean }>(`/inventory/${id}`, { method: "DELETE" }),
    // Cofre de senhas
    credentials: {
      list: (params?: Record<string, string>) => {
        const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
        return fetchJson<{ data: Credential[]; total: number }>(`/inventory/credentials${qs}`);
      },
      get: (id: string) => fetchJson<{ data: Credential }>(`/inventory/credentials/${id}`),
      create: (payload: Record<string, unknown>) =>
        fetchJson<{ data: Credential }>("/inventory/credentials", { method: "POST", body: JSON.stringify(payload) }),
      update: (id: string, payload: Record<string, unknown>) =>
        fetchJson<{ data: Credential }>(`/inventory/credentials/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
      remove: (id: string) => fetchJson<{ ok: boolean }>(`/inventory/credentials/${id}`, { method: "DELETE" }),
      // Revela a senha em texto puro (requer permissão e gera log de auditoria)
      reveal: (id: string) =>
        fetchJson<{ data: { id: string; secret: string } }>(`/inventory/credentials/${id}/reveal`, { method: "POST" }),
      grants: {
        list: (credentialId: string) =>
          fetchJson<{ data: CredentialGrant[] }>(`/inventory/credentials/${credentialId}/grants`),
        create: (credentialId: string, payload: Record<string, unknown>) =>
          fetchJson<{ data: CredentialGrant }>(`/inventory/credentials/${credentialId}/grants`, {
            method: "POST",
            body: JSON.stringify(payload)
          }),
        remove: (credentialId: string, grantId: string) =>
          fetchJson<{ ok: boolean }>(`/inventory/credentials/${credentialId}/grants/${grantId}`, { method: "DELETE" })
      }
    }
  },
  userGroups: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return fetchJson<{ data: UserGroup[] }>(`/user-groups${qs}`);
    },
    get: (id: string) => fetchJson<{ data: UserGroup }>(`/user-groups/${id}`),
    create: (payload: Record<string, unknown>) =>
      fetchJson<{ data: UserGroup }>("/user-groups", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      fetchJson<{ ok: boolean }>(`/user-groups/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id: string) => fetchJson<{ ok: boolean }>(`/user-groups/${id}`, { method: "DELETE" })
  },
  dashboard: {
    ticketsOperational: (params?: TicketDashboardFilters, options?: RequestInit) => {
      const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
      return fetchJson<TicketOperationalDashboardResponse>(`/dashboard/tickets${qs}`, options);
    },
    exportTicketsOperational: (params: TicketDashboardFilters & { format: "xlsx" | "pdf" | "json" }) => {
      const qs = `?${new URLSearchParams(params as any).toString()}`;
      return fetch(`${API_BASE}/dashboard/tickets/export${qs}`);
    }
  }
};
