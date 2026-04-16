import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ChatConversationFooter } from "./index";

function renderFooter(props?: Partial<React.ComponentProps<typeof ChatConversationFooter>>) {
  const onSelectedTicketIdChange = vi.fn();
  const onAssociate = vi.fn();
  const onActiveArchivedIdChange = vi.fn();
  const onFinalize = vi.fn();

  render(
    <ThemeProvider theme={getTheme("light" as any)}>
      <ChatConversationFooter
        tickets={[
          { id: "t1", number: 101, subject: "First ticket" },
          { id: "t2", number: 102, subject: "Second ticket" }
        ]}
        selectedTicketId=""
        onSelectedTicketIdChange={onSelectedTicketIdChange}
        onAssociate={onAssociate}
        showArchived={false}
        archivedConversations={[]}
        activeArchivedId=""
        onActiveArchivedIdChange={onActiveArchivedIdChange}
        onFinalize={onFinalize}
        finalizeDisabled={false}
        {...props}
      />
    </ThemeProvider>
  );

  return { onSelectedTicketIdChange, onAssociate, onActiveArchivedIdChange, onFinalize };
}

describe("ChatConversationFooter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders ticket select and options", () => {
    renderFooter();
    const select = screen.getByRole("combobox", { name: "Ticket" });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Associar a um ticket..." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "#101 — First ticket" })).toBeInTheDocument();
  });

  it("calls ticket change handler", () => {
    const handlers = renderFooter();
    const select = screen.getByRole("combobox", { name: "Ticket" });
    fireEvent.change(select, { target: { value: "t2" } });
    expect(handlers.onSelectedTicketIdChange).toHaveBeenCalledWith("t2");
  });

  it("disables associate button when requested", () => {
    renderFooter({ associateDisabled: true });
    expect(screen.getByRole("button", { name: "Associar" })).toBeDisabled();
  });

  it("renders archived select when showArchived is enabled and calls handler", () => {
    const handlers = renderFooter({
      showArchived: true,
      archivedConversations: [{ id: "a1", closedAt: "2026-04-15T10:00:00.000Z", ticketNumber: 99 }]
    });

    const archived = screen.getByRole("combobox", { name: "Histórico" });
    fireEvent.change(archived, { target: { value: "a1" } });
    expect(handlers.onActiveArchivedIdChange).toHaveBeenCalledWith("a1");
  });

  it("shows finalize label and disables finalize button when requested", () => {
    renderFooter({ finalizeDisabled: true, finalizeLabel: "Finalizando..." });
    const finalize = screen.getByRole("button", { name: "Finalizando..." });
    expect(finalize).toBeDisabled();
  });
});

