import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { useState } from "react";
import { HistoryToggle } from "./HistoryToggle";
import { getPersistedBoolean, setPersistedBoolean } from "@/lib/persistedBoolean";

const KEY = "ticketbr-test-show-archived";

function Harness() {
  const [show, setShow] = useState(() => getPersistedBoolean(KEY, false));
  return (
    <div>
      <HistoryToggle
        checked={show}
        label="Mostrar conversas anteriores"
        onChange={(next) => {
          setShow(next);
          setPersistedBoolean(KEY, next);
        }}
      />
      {show ? <div data-testid="archived">Abrir conversa finalizada...</div> : null}
    </div>
  );
}

describe("HistoryToggle persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fica desativado por padrão e persiste após alternar", () => {
    const { unmount } = render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <Harness />
      </ThemeProvider>
    );

    expect(screen.queryByTestId("archived")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByTestId("archived")).toBeInTheDocument();

    unmount();
    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <Harness />
      </ThemeProvider>
    );
    expect(screen.getByTestId("archived")).toBeInTheDocument();
  });
});

