import { Ticket, TicketStatus } from "@/types/ticket";
import { Task } from "@/types/task";
import { Project } from "@/types/project";

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
        })
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
    export: (payload: any) => fetch(`${API_BASE}/projects/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  }
};
