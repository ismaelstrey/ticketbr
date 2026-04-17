import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { AppLayout } from "./AppLayout";

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>
}));

describe("AppLayout", () => {
  it("expõe skip link e landmark principal", () => {
    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <AppLayout>
          <div>Conteúdo</div>
        </AppLayout>
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: "Pular para conteúdo" })).toHaveAttribute(
      "href",
      "#main-content"
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });
});
