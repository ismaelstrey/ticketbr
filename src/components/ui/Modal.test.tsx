import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { Modal } from "./Modal";
import type { ReactNode } from "react";

function renderWithTheme(ui: ReactNode) {
  return render(<ThemeProvider theme={getTheme("light" as any)}>{ui}</ThemeProvider>);
}

afterEach(() => cleanup());

describe("Modal", () => {
  it("fecha ao pressionar ESC", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Teste">
        <button type="button">Ação</button>
      </Modal>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar no backdrop", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Teste">
        <button type="button">Ação</button>
      </Modal>
    );

    const overlay = screen.getByRole("dialog").parentElement;
    expect(overlay).toBeTruthy();
    fireEvent.mouseDown(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("mantém foco ciclando com Tab dentro do diálogo", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Teste">
        <button type="button">Primeiro</button>
        <button type="button">Último</button>
      </Modal>
    );

    const closeButton = screen.getByRole("button", { name: "Fechar modal" });
    const lastButton = screen.getByRole("button", { name: "Último" });

    lastButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });
});
