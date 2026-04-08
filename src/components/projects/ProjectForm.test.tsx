import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ProjectForm } from "@/components/projects/ProjectForm";

describe("ProjectForm", () => {
  it("bloqueia submit quando nome é inválido", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const { getByText } = render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <ProjectForm
          value={{ name: "A", description: "", status: "ACTIVE", startDate: "", endDate: "" }}
          onChange={() => {}}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitLabel="Salvar"
        />
      </ThemeProvider>
    );

    fireEvent.click(getByText("Salvar"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mostra erro quando fim é anterior ao início", () => {
    const { getByLabelText, getByText } = render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <ProjectForm
          value={{ name: "Projeto", description: "", status: "ACTIVE", startDate: "2026-02-10", endDate: "2026-02-01" }}
          onChange={() => {}}
          onSubmit={() => {}}
          onCancel={() => {}}
          submitLabel="Salvar"
        />
      </ThemeProvider>
    );

    expect(getByLabelText("Fim")).toBeTruthy();
    expect(getByText("A data final não pode ser anterior à data inicial")).toBeTruthy();
  });
});

