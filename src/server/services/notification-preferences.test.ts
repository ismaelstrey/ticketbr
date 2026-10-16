import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.fn();
const executeRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: queryRawMock,
    $executeRawUnsafe: executeRawMock
  }
}));

describe("notification-preferences service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    queryRawMock.mockResolvedValue([]);
    executeRawMock.mockResolvedValue(1);
    const { invalidateNotificationPreferencesCache } = await import("./notification-preferences");
    invalidateNotificationPreferencesCache();
  });

  it("normaliza entrada parcial mantendo os padrões habilitados", async () => {
    const { normalizeNotificationPreferences } = await import("./notification-preferences");

    const preferences = normalizeNotificationPreferences({
      emailEnabled: false,
      types: { SLA_WARNING: false }
    });

    expect(preferences.inAppEnabled).toBe(true);
    expect(preferences.emailEnabled).toBe(false);
    expect(preferences.types.SLA_WARNING).toBe(false);
    expect(preferences.types.SLA_BREACHED).toBe(true);
  });

  it("devolve os padrões quando o banco falha", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("relation does not exist"));

    const { getNotificationPreferences } = await import("./notification-preferences");
    const preferences = await getNotificationPreferences();

    expect(preferences.inAppEnabled).toBe(true);
    expect(preferences.emailEnabled).toBe(true);
    expect(preferences.types.TICKET_COMMENT).toBe(true);
  });

  it("lê e normaliza as preferências persistidas", async () => {
    queryRawMock.mockResolvedValueOnce([{ value: { inAppEnabled: false, types: { TICKET_ASSIGNED: false } } }]);

    const { getNotificationPreferences } = await import("./notification-preferences");
    const preferences = await getNotificationPreferences();

    expect(preferences.inAppEnabled).toBe(false);
    expect(preferences.types.TICKET_ASSIGNED).toBe(false);
    expect(preferences.types.SLA_BREACHED).toBe(true);
  });

  it("usa cache em memória entre leituras consecutivas", async () => {
    const { getNotificationPreferences } = await import("./notification-preferences");

    await getNotificationPreferences();
    await getNotificationPreferences();

    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("persiste as preferências criando a tabela e invalidando o cache", async () => {
    queryRawMock.mockResolvedValueOnce([{ value: { emailEnabled: true } }]);

    const { getNotificationPreferences, saveNotificationPreferences } = await import("./notification-preferences");

    await getNotificationPreferences();
    expect(queryRawMock).toHaveBeenCalledTimes(1);

    const saved = await saveNotificationPreferences({ inAppEnabled: false, types: { SLA_WARNING: false } });

    expect(saved.inAppEnabled).toBe(false);
    expect(saved.types.SLA_WARNING).toBe(false);
    expect(saved.types.TICKET_COMMENT).toBe(true);
    expect(executeRawMock).toHaveBeenCalledTimes(2);
    expect(String(executeRawMock.mock.calls[0][0])).toContain("CREATE TABLE IF NOT EXISTS app_runtime_settings");

    // Cache foi atualizado no save: nova leitura não consulta o banco
    queryRawMock.mockClear();
    const reloaded = await getNotificationPreferences();
    expect(reloaded.inAppEnabled).toBe(false);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("invalida o cache forçando nova consulta ao banco", async () => {
    const { getNotificationPreferences, invalidateNotificationPreferencesCache } = await import(
      "./notification-preferences"
    );

    await getNotificationPreferences();
    expect(queryRawMock).toHaveBeenCalledTimes(1);

    invalidateNotificationPreferencesCache();
    await getNotificationPreferences();
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });

  it("indica se um tipo está habilitado", async () => {
    const { isNotificationTypeEnabled } = await import("./notification-preferences");

    const preferences = {
      inAppEnabled: true,
      emailEnabled: true,
      types: {
        TICKET_STATUS_CHANGED: true,
        TICKET_COMMENT: false,
        TICKET_ASSIGNED: true,
        SLA_WARNING: true,
        SLA_BREACHED: true
      }
    };

    expect(isNotificationTypeEnabled(preferences, "TICKET_COMMENT")).toBe(false);
    expect(isNotificationTypeEnabled(preferences, "SLA_BREACHED")).toBe(true);
  });
});
