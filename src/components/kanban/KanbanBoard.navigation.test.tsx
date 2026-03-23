import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";

const pushMock = vi.fn();
const listMock = vi.fn();
const getMock = vi.fn();
const updateMock = vi.fn();
const updateStatusMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => null
}));

vi.mock("@/components/layout/Topbar", () => ({
  Topbar: () => null
}));

vi.mock("@/components/kanban/PauseModal", () => ({
  PauseModal: () => null
}));

vi.mock("@/components/ticket/NewTicketModal", () => ({
  default: () => null
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock("@/hooks/useTicketDragDrop", () => ({
  useTicketDragDrop: () => {
    const [tickets, setTickets] = React.useState<any[]>([]);
    return {
      tickets,
      setTickets,
      dragOverColumn: null,
      onTicketDragStart: () => {},
      onTicketDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDrop: () => {},
      setDragOverColumn: () => {},
      pauseModalTicket: null,
      pauseReason: "",
      setPauseReason: () => {},
      closePauseModal: () => {},
      confirmPause: () => {},
      pauseSla: false,
      setPauseSla: () => {}
    };
  }
}));

vi.mock("@/components/kanban/Column", () => ({
  KanbanColumn: ({ tickets, onOpenTicket }: any) => (
    <div>
      {tickets.map((t: any) => (
        <button key={t.id} type="button" onClick={() => onOpenTicket(t.id)}>
          abrir {t.id}
        </button>
      ))}
    </div>
  )
}));

vi.mock("@/components/ticket/TicketDetails", () => ({
  default: ({ ticket, onBack }: any) => (
    <div>
      <div data-testid="ticket-details">{ticket.id}</div>
      <button type="button" onClick={onBack}>
        voltar
      </button>
    </div>
  )
}));

vi.mock("@/services/api", () => ({
  api: {
    tickets: {
      list: (...args: any[]) => listMock(...args),
      get: (...args: any[]) => getMock(...args),
      update: (...args: any[]) => updateMock(...args),
      updateStatus: (...args: any[]) => updateStatusMock(...args)
    },
    users: { list: vi.fn() }
  }
}));

import KanbanBoard from "./KanbanBoard";

function renderBoard(ui: React.ReactElement) {
  return render(<ThemeProvider theme={getTheme("light" as any)}>{ui}</ThemeProvider>);
}

describe("KanbanBoard navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue({ data: [] });
    getMock.mockResolvedValue({ data: null });
    updateMock.mockResolvedValue({ data: null });
    updateStatusMock.mockResolvedValue({ data: null });
  });

  it("navega para /ticket/kanban/{id} ao clicar em um ticket", async () => {
    listMock.mockResolvedValueOnce({
      data: [
        {
          id: "t1",
          number: 1,
          empresa: "Empresa A",
          solicitante: "Solicitante A",
          assunto: "Assunto A",
          prioridade: "Alta",
          data: "2026-03-23",
          progressoSla: 50,
          progressoTarefa: 10,
          status: "todo"
        }
      ]
    });

    renderBoard(<KanbanBoard />);

    const open = await screen.findByRole("button", { name: "abrir t1" });
    fireEvent.click(open);
    expect(pushMock).toHaveBeenCalledWith("/ticket/kanban/t1");
  });

  it("carrega ticket pelo id da rota quando não está na lista", async () => {
    listMock.mockResolvedValueOnce({ data: [] });
    getMock.mockResolvedValueOnce({
      data: {
        id: "t2",
        number: 2,
        empresa: "Empresa B",
        solicitante: "Solicitante B",
        assunto: "Assunto B",
        prioridade: "Média",
        data: "2026-03-23",
        progressoSla: 30,
        progressoTarefa: 0,
        status: "todo"
      }
    });

    renderBoard(<KanbanBoard initialTicketId="t2" />);

    const details = await screen.findByTestId("ticket-details");
    expect(details.textContent).toBe("t2");
  });

  it("mostra erro quando ticket não existe", async () => {
    listMock.mockResolvedValueOnce({ data: [] });
    getMock.mockRejectedValueOnce(new Error("API Error: 404 Not Found"));

    renderBoard(<KanbanBoard initialTicketId="missing" />);

    await waitFor(() => expect(screen.getByText("Ticket não encontrado")).toBeInTheDocument());
  });
});
