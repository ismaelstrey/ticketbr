import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { PeripheralNotice } from "./PeripheralNotice";

describe("PeripheralNotice", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("oculta automaticamente após inatividade e reabre ao clicar", async () => {
    vi.useFakeTimers();
    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <PeripheralNotice title="Conversa disponível" hint="Hint" idleMs={3000} />
      </ThemeProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3001);
    });
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(screen.getByLabelText("Exibir status da conversa"));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
