import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { HistoryToggle } from "./HistoryToggle";

describe("HistoryToggle", () => {
  it("renderiza label e alterna ao clicar", () => {
    const onChange = vi.fn();

    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <HistoryToggle checked={false} label="Mostrar conversas anteriores" onChange={onChange} />
      </ThemeProvider>
    );

    expect(screen.getByText("Mostrar conversas anteriores")).toBeInTheDocument();
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

