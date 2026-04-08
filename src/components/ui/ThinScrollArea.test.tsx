import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ThinScrollArea } from "./ThinScrollArea";

describe("ThinScrollArea", () => {
  it("renderiza 50 itens com overflow vertical e altura máxima", () => {
    const { container, getByText } = render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <div style={{ height: 300, width: 320 }}>
          <ThinScrollArea data-testid="area">
            {Array.from({ length: 50 }).map((_, idx) => (
              <div key={idx}>Item {idx + 1}</div>
            ))}
          </ThinScrollArea>
        </div>
      </ThemeProvider>
    );

    expect(getByText("Item 50")).toBeTruthy();

    const styles = Array.from(container.ownerDocument.querySelectorAll("style"))
      .map((tag) => tag.textContent || "")
      .join("\n");

    expect(/overflow-y:\s*auto/i.test(styles)).toBe(true);
    expect(/max-height:\s*100%/i.test(styles)).toBe(true);
    expect(/::-webkit-scrollbar\s*\{[\s\S]*width:\s*4px/i.test(styles)).toBe(true);
  });
});
