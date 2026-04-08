import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ProjectsFilters } from "@/components/projects/ProjectsFilters";

describe("ProjectsFilters", () => {
  it("chama aplicar e limpar", () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();

    const { getByText, getByLabelText } = render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <ProjectsFilters
          value={{ q: "", status: "", ownerUserId: "", startDateFrom: "", endDateTo: "" }}
          owners={[{ id: "u1", name: "Admin" }]}
          onChange={onChange}
          onApply={onApply}
          onReset={onReset}
        />
      </ThemeProvider>
    );

    fireEvent.change(getByLabelText("Busca"), { target: { value: "ERP" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText("Aplicar"));
    expect(onApply).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText("Limpar"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

