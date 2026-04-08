import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { Sidebar } from "./Sidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/ticket/kanban"
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Admin", role: "ADMIN" }, logout: vi.fn() })
}));

describe("Sidebar (design)", () => {
  it("usa largura compacta entre 60–80px quando retraído", () => {
    const { container } = render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <Sidebar />
      </ThemeProvider>
    );

    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(window.getComputedStyle(aside as HTMLElement).width).toBe("72px");
  });

  it("mantém cor única (inherit) para ícone e texto no item", async () => {
    const { container } = render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <Sidebar />
      </ThemeProvider>
    );

    const item = container.querySelector('button[title="Dashboards"]') as HTMLButtonElement | null;
    expect(item).toBeTruthy();
    const icon = item!.querySelector("span") as HTMLSpanElement | null;
    expect(icon).toBeTruthy();
    expect(window.getComputedStyle(icon!).color).toBe(window.getComputedStyle(item!).color);
  });
});
