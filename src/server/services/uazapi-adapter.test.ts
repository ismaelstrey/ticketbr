import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildUazapiSseUrl, requestUazapi, resolveUazapiBaseUrl } from "./uazapi-adapter";

describe("uazapi-adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolve baseUrl from config.uazapiBaseUrl", () => {
    expect(resolveUazapiBaseUrl({ uazapiBaseUrl: "https://api.uazapi.com/" } as any)).toBe("https://api.uazapi.com");
  });

  it("resolve baseUrl from subdomain when baseUrl is empty", () => {
    expect(resolveUazapiBaseUrl({ uazapiSubdomain: "free" } as any)).toBe("https://free.uazapi.com");
  });

  it("sends token header by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{\"ok\":true}"
    });
    vi.stubGlobal("fetch", fetchMock as any);

    await requestUazapi({ pathOrUrl: "/instance/status" }, { uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok_123" } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.token).toBe("tok_123");
  });

  it("falha com token mascarado (ByteString inválido) sem chamar fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as any);

    await expect(
      requestUazapi({ pathOrUrl: "/instance/status" }, { uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok_••••" } as any)
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("sends admintoken header when requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{\"ok\":true}"
    });
    vi.stubGlobal("fetch", fetchMock as any);

    await requestUazapi(
      { pathOrUrl: "/instance/all", auth: "admintoken" },
      { uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok_123", uazapiAdminToken: "adm_123" } as any
    );

    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.admintoken).toBe("adm_123");
    expect(init.headers.token).toBeUndefined();
  });

  it("retries with exponential backoff on 5xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "{\"message\":\"fail\"}"
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "{\"ok\":true}"
      });
    vi.stubGlobal("fetch", fetchMock as any);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = await requestUazapi(
      { pathOrUrl: "/instance/status" },
      { uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok_123", uazapiRetryEnabled: true, uazapiRetryMax: 2, uazapiRetryDelayMs: 0 } as any
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });

  it("builds SSE url using query token", () => {
    const url = buildUazapiSseUrl({ events: ["messages", "chats"] }, { uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok_123" } as any);
    expect(url).toContain("https://api.uazapi.com/sse?");
    expect(url).toContain("token=tok_123");
    expect(url).toContain("events=messages%2Cchats");
  });
});
