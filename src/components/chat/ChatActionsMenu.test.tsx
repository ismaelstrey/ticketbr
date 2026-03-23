import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ChatActionsMenu } from "./ChatActionsMenu";

function renderMenu(props?: Partial<React.ComponentProps<typeof ChatActionsMenu>>) {
  const onToggleShowArchived = vi.fn();
  const onRequestAlertPermission = vi.fn();
  const onToggleSound = vi.fn();

  render(
    <ThemeProvider theme={getTheme("light" as any)}>
      <ChatActionsMenu
        showArchived={false}
        onToggleShowArchived={onToggleShowArchived}
        enableAlert={false}
        onRequestAlertPermission={onRequestAlertPermission}
        enableSound={true}
        onToggleSound={onToggleSound}
        {...props}
      />
    </ThemeProvider>
  );

  return { onToggleShowArchived, onRequestAlertPermission, onToggleSound };
}

describe("ChatActionsMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("abre e fecha ao clicar fora", () => {
    renderMenu();

    fireEvent.click(screen.getByLabelText("Menu de ações do chat"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("executa ações e fecha ao selecionar", () => {
    const handlers = renderMenu({ showArchived: false, enableAlert: false, enableSound: true });

    fireEvent.click(screen.getByLabelText("Menu de ações do chat"));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Histórico" }));
    expect(handlers.onToggleShowArchived).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByLabelText("Menu de ações do chat"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Ativar alerta" }));
    expect(handlers.onRequestAlertPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByLabelText("Menu de ações do chat"));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Ativar som" }));
    expect(handlers.onToggleSound).toHaveBeenCalledWith(false);
  });
});
