import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getTheme } from "@/styles/theme";
import { ChatOpenConversationsProvider, broadcastChatOpenConversationsInvalidation } from "@/context/ChatOpenConversationsContext";
import { GlobalChatButton } from "./GlobalChatButton";

const pushMock = vi.fn();
const userMock = { id: "u1" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/ticket/kanban"
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: userMock, loading: false })
}));

describe("GlobalChatButton open conversations badge", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("não mostra badge quando openCount é 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] })
    })) as any);

    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <ChatOpenConversationsProvider pollIntervalMs={60_000}>
          <GlobalChatButton />
        </ChatOpenConversationsProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByLabelText("Abrir chat")).toBeInTheDocument());
    expect(screen.queryByText("1")).toBeNull();
  });

  it("mostra badge com contagem de conversas em aberto", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: "c1", hasOpenConversation: true }] })
    })) as any);

    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <ChatOpenConversationsProvider pollIntervalMs={60_000}>
          <GlobalChatButton />
        </ChatOpenConversationsProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("atualiza badge ao invalidar (nova conversa/removida)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: "c1", hasOpenConversation: true }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: "c1", hasOpenConversation: true }, { id: "c2", hasOpenConversation: true }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    vi.stubGlobal("fetch", fetchMock as any);

    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <ChatOpenConversationsProvider pollIntervalMs={60_000}>
          <GlobalChatButton />
        </ChatOpenConversationsProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());

    broadcastChatOpenConversationsInvalidation();
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());

    broadcastChatOpenConversationsInvalidation();
    await waitFor(() => expect(screen.queryByText("1")).toBeNull());
  });

  it("trata erro de fetch sem quebrar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as any);

    render(
      <ThemeProvider theme={getTheme("light" as any)}>
        <ChatOpenConversationsProvider pollIntervalMs={60_000}>
          <GlobalChatButton />
        </ChatOpenConversationsProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByLabelText("Abrir chat")).toBeInTheDocument());
    expect(screen.queryByText("1")).toBeNull();
  });
});
