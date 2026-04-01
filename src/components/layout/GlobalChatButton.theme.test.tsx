import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { GlobalChatButton } from "./GlobalChatButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/ticket/kanban"
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false })
}));

vi.mock("@/context/ChatOpenConversationsContext", () => ({
  useChatOpenConversations: () => ({ openCount: 0 })
}));

describe("GlobalChatButton theme", () => {
  afterEach(() => {
    cleanup();
  });

  it("usa texto escuro no light mode", () => {
    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <GlobalChatButton />
      </ThemeProvider>
    );

    const button = screen.getByLabelText("Abrir chat");
    expect(window.getComputedStyle(button).color).toBe("rgb(15, 23, 42)");
  });

  it("usa texto claro no dark mode", () => {
    render(
      <ThemeProvider theme={getTheme("dark" as any)}>
        <GlobalChatButton />
      </ThemeProvider>
    );

    const button = screen.getByLabelText("Abrir chat");
    expect(window.getComputedStyle(button).color).toBe("rgb(255, 255, 255)");
  });
});
