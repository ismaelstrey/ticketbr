import { Ticket, TicketStatus } from "@/types/ticket";

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
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
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
    updateStatus: (id: string, status: TicketStatus, reason?: string) => 
        fetchJson<{ data: Ticket }>(`/tickets/${id}/status`, {
            method: "POST",
            body: JSON.stringify({ status, pauseReason: reason })
        })
  },
  users: {
      list: () => fetchJson<any[]>("/users")
  }
};
