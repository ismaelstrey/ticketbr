import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { EmptyState, ErrorState, LoadingState } from "./FeedbackState";
import type { ReactNode } from "react";

function renderWithTheme(ui: ReactNode) {
  return render(<ThemeProvider theme={getTheme("light" as any)}>{ui}</ThemeProvider>);
}

afterEach(() => cleanup());

describe("FeedbackState", () => {
  it("renderiza loading com role status e aria-live polido", () => {
    renderWithTheme(<LoadingState />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Carregando")).toBeInTheDocument();
  });

  it("renderiza erro com alerta e dispara ação de retry", () => {
    const onAction = vi.fn();
    renderWithTheme(<ErrorState onAction={onAction} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renderiza vazio sem ação", () => {
    renderWithTheme(<EmptyState />);
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
