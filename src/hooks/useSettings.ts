import { useState, useCallback } from "react";
import { useToast } from "@/context/ToastContext";

export interface IntegrationSettings {
  whatsappProvider: "n8n" | "evolution" | "uazapi";
  evolutionBaseUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  webhookUrl: string;
  evolutionWebhookUrl: string;
  evolutionTimeoutMs: string;
  evolutionRetryEnabled: boolean;
  evolutionRetryMax: string;
  evolutionRetryDelayMs: string;
  autoLinkTickets: boolean;
  n8nWebhookUrl: string;
  n8nUseTestWebhook: boolean;
  n8nBaseUrl: string;
  n8nApiKey: string;
  n8nConversationsPath: string;
  n8nMessagesPath: string;
  n8nSendPath: string;
  n8nContactsPath: string;

  uazapiBaseUrl: string;
  uazapiSubdomain: "free" | "api";
  uazapiToken: string;
  uazapiAdminToken: string;
  uazapiTransport: "rest" | "sse" | "websocket" | "graphql";
}

export interface SyncedContact {
  id: string;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  instanceId: string | null;
}

export interface WebhookRequestLog {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  route: string;
  source: string;
  status: number;
  ok: boolean;
  ip: string | null;
  userAgent: string | null;
  payload: unknown;
  headers: Record<string, string>;
}

export const defaultSettings: IntegrationSettings = {
  whatsappProvider: "n8n",
  evolutionBaseUrl: "",
  evolutionApiKey: "",
  evolutionInstance: "",
  webhookUrl: "",
  evolutionWebhookUrl: "",
  evolutionTimeoutMs: "15000",
  evolutionRetryEnabled: true,
  evolutionRetryMax: "2",
  evolutionRetryDelayMs: "750",
  autoLinkTickets: true,
  n8nWebhookUrl: "",
  n8nUseTestWebhook: false,
  n8nBaseUrl: "",
  n8nApiKey: "",
  n8nConversationsPath: "/conversations",
  n8nMessagesPath: "/messages",
  n8nSendPath: "/send",
  n8nContactsPath: "/todos/contatos",

  uazapiBaseUrl: "",
  uazapiSubdomain: "api",
  uazapiToken: "",
  uazapiAdminToken: "",
  uazapiTransport: "rest"
};

export function useSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  
  // Estados de carregamento específicos
  const [testingApi, setTestingApi] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingWebhookLogs, setLoadingWebhookLogs] = useState(false);

  // Resultados
  const [n8nTestResult, setN8nTestResult] = useState<unknown>(null);
  const [contactsSyncResult, setContactsSyncResult] = useState<unknown>(null);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookRequestLog[]>([]);
  
  // Status de conexão
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("desconhecido");

  const updateSettings = useCallback((patch: Partial<IntegrationSettings>) => {
    setSettings((curr) => ({ ...curr, ...patch }));
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/whatsapp/config");
      const json = await res.json();
      
      if (json?.data) {
        setSettings((curr) => ({
          ...curr,
          whatsappProvider: (json.data.whatsappProvider === "evolution" || json.data.whatsappProvider === "uazapi" || json.data.whatsappProvider === "n8n")
            ? json.data.whatsappProvider
            : curr.whatsappProvider,
          evolutionBaseUrl: json.data.baseUrl ?? curr.evolutionBaseUrl,
          evolutionInstance: json.data.instance ?? curr.evolutionInstance,
          webhookUrl: json.data.webhookUrl ?? json.data.evolutionWebhookUrl ?? curr.webhookUrl,
          evolutionWebhookUrl: json.data.evolutionWebhookUrl ?? json.data.webhookUrl ?? curr.evolutionWebhookUrl,
          evolutionTimeoutMs: String(json.data.evolutionTimeoutMs ?? curr.evolutionTimeoutMs),
          evolutionRetryEnabled: typeof json.data.evolutionRetryEnabled === "boolean" ? json.data.evolutionRetryEnabled : curr.evolutionRetryEnabled,
          evolutionRetryMax: String(json.data.evolutionRetryMax ?? curr.evolutionRetryMax),
          evolutionRetryDelayMs: String(json.data.evolutionRetryDelayMs ?? curr.evolutionRetryDelayMs),
          autoLinkTickets: typeof json.data.autoLinkTickets === "boolean" ? json.data.autoLinkTickets : curr.autoLinkTickets,
          n8nWebhookUrl: json.data.n8nWebhookUrl ?? curr.n8nWebhookUrl,
          n8nUseTestWebhook: typeof json.data.n8nUseTestWebhook === "boolean" ? json.data.n8nUseTestWebhook : curr.n8nUseTestWebhook,
          n8nBaseUrl: json.data.n8nBaseUrl ?? curr.n8nBaseUrl,
          evolutionApiKey: json.data.apiKeyMasked ?? curr.evolutionApiKey,
          n8nApiKey: json.data.n8nApiKeyMasked ?? curr.n8nApiKey,
          n8nConversationsPath: json.data.n8nConversationsPath ?? curr.n8nConversationsPath,
          n8nMessagesPath: json.data.n8nMessagesPath ?? curr.n8nMessagesPath,
          n8nSendPath: json.data.n8nSendPath ?? curr.n8nSendPath,
          n8nContactsPath: json.data.n8nContactsPath ?? curr.n8nContactsPath,

          uazapiBaseUrl: json.data.uazapiBaseUrl ?? curr.uazapiBaseUrl,
          uazapiSubdomain: (json.data.uazapiSubdomain === "free" || json.data.uazapiSubdomain === "api")
            ? json.data.uazapiSubdomain
            : curr.uazapiSubdomain,
          uazapiToken: json.data.uazapiTokenMasked ?? curr.uazapiToken,
          uazapiAdminToken: json.data.uazapiAdminTokenMasked ?? curr.uazapiAdminToken,
          uazapiTransport: (json.data.uazapiTransport === "sse" || json.data.uazapiTransport === "websocket" || json.data.uazapiTransport === "graphql" || json.data.uazapiTransport === "rest")
            ? json.data.uazapiTransport
            : curr.uazapiTransport
        }));
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      if (settings.whatsappProvider === "uazapi") {
        if (!settings.uazapiToken.trim()) {
          showToast("Informe o token da instância do UAZAPI.", "error");
          return;
        }
        if (!settings.uazapiBaseUrl.trim() && !settings.uazapiSubdomain) {
          showToast("Informe a URL base do UAZAPI ou selecione um subdomínio.", "error");
          return;
        }
        if (settings.uazapiTransport === "websocket" || settings.uazapiTransport === "graphql") {
          showToast("O UAZAPI não expõe WebSocket/GraphQL no spec; use REST ou SSE.", "error");
          return;
        }
      }

      const res = await fetch("/api/settings/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappProvider: settings.whatsappProvider,
          baseUrl: settings.evolutionBaseUrl,
          apiKey: settings.evolutionApiKey,
          instance: settings.evolutionInstance,
          webhookUrl: settings.evolutionWebhookUrl || settings.webhookUrl,
          evolutionWebhookUrl: settings.evolutionWebhookUrl || settings.webhookUrl,
          evolutionTimeoutMs: settings.evolutionTimeoutMs,
          evolutionRetryEnabled: settings.evolutionRetryEnabled,
          evolutionRetryMax: settings.evolutionRetryMax,
          evolutionRetryDelayMs: settings.evolutionRetryDelayMs,
          autoLinkTickets: settings.autoLinkTickets,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook,
          n8nBaseUrl: settings.n8nBaseUrl,
          n8nApiKey: settings.n8nApiKey,
          n8nConversationsPath: settings.n8nConversationsPath,
          n8nMessagesPath: settings.n8nMessagesPath,
          n8nSendPath: settings.n8nSendPath,
          n8nContactsPath: settings.n8nContactsPath,

          uazapiBaseUrl: settings.uazapiBaseUrl,
          uazapiSubdomain: settings.uazapiSubdomain,
          uazapiToken: settings.uazapiToken,
          uazapiAdminToken: settings.uazapiAdminToken,
          uazapiTransport: settings.uazapiTransport
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar configuração");

      showToast("Configurações salvas.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao salvar", "error");
      throw error;
    }
  }, [settings, showToast]);

  const testSystemApi = useCallback(async () => {
    try {
      setTestingApi(true);
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Healthcheck falhou");
      showToast("API online.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao testar API", "error");
    } finally {
      setTestingApi(false);
    }
  }, [showToast]);

  const testN8n = useCallback(async () => {
    try {
      setTestingN8n(true);
      setN8nTestResult(null);
      const res = await fetch("/api/settings/n8n/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n8nBaseUrl: settings.n8nBaseUrl,
          n8nApiKey: settings.n8nApiKey,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook,
          n8nConversationsPath: settings.n8nConversationsPath,
          n8nMessagesPath: settings.n8nMessagesPath,
          n8nSendPath: settings.n8nSendPath
        })
      });
      const json = await res.json();
      setN8nTestResult(json);
      if (!res.ok) throw new Error(json?.error || "Falha no teste do N8N");
      showToast("Comunicação com n8n OK.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao testar N8N", "error");
    } finally {
      setTestingN8n(false);
    }
  }, [settings, showToast]);

  const loadSyncedContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await fetch("/api/settings/contacts?limit=500");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar contatos sincronizados");
      setContacts(Array.isArray(json?.data) ? json.data : []);
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao carregar contatos sincronizados", "error");
    } finally {
      setLoadingContacts(false);
    }
  }, [showToast]);

  const syncContacts = useCallback(async () => {
    try {
      setSyncingContacts(true);
      setContactsSyncResult(null);
      const uazapiToken = settings.uazapiToken.includes("•") ? undefined : settings.uazapiToken;
      const uazapiAdminToken = settings.uazapiAdminToken.includes("•") ? undefined : settings.uazapiAdminToken;

      if (settings.whatsappProvider === "uazapi") {
        if (!settings.uazapiToken.trim()) {
          showToast("Informe o token da instância do UAZAPI ou salve a configuração para reutilizar o token.", "error");
          return;
        }
        if (!settings.uazapiBaseUrl.trim() && !settings.uazapiSubdomain) {
          showToast("Informe a URL base do UAZAPI ou selecione um subdomínio.", "error");
          return;
        }
      }

      const res = await fetch("/api/settings/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappProvider: settings.whatsappProvider,
          n8nBaseUrl: settings.n8nBaseUrl,
          n8nApiKey: settings.n8nApiKey,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook,
          n8nContactsPath: settings.n8nContactsPath,
          uazapiBaseUrl: settings.uazapiBaseUrl,
          uazapiSubdomain: settings.uazapiSubdomain,
          uazapiToken,
          uazapiAdminToken,
          uazapiTransport: settings.uazapiTransport
        })
      });

      const json = await res.json();
      setContactsSyncResult(json);
      if (!res.ok) throw new Error(json?.error || "Falha ao sincronizar contatos");

      await loadSyncedContacts();
      showToast("Contatos sincronizados com sucesso.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao sincronizar contatos", "error");
    } finally {
      setSyncingContacts(false);
    }
  }, [settings, loadSyncedContacts, showToast]);


  const loadWebhookLogs = useCallback(async () => {
    try {
      setLoadingWebhookLogs(true);
      const res = await fetch("/api/settings/webhook-logs?limit=120", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar logs de webhook");
      setWebhookLogs(Array.isArray(json?.data) ? json.data : []);
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao carregar logs de webhook", "error");
    } finally {
      setLoadingWebhookLogs(false);
    }
  }, [showToast]);

  const clearWebhookLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/webhook-logs", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao limpar logs");
      setWebhookLogs([]);
      showToast("Logs externos limpos.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao limpar logs", "error");
    }
  }, [showToast]);

  const loadQr = useCallback(async () => {
    try {
      setLoadingQr(true);
      setTestingApi(true); // compatibilidade visual
      const uazapiToken = settings.uazapiToken.includes("•") ? undefined : settings.uazapiToken;
      const uazapiAdminToken = settings.uazapiAdminToken.includes("•") ? undefined : settings.uazapiAdminToken;
      const res = await fetch("/api/settings/whatsapp/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappProvider: settings.whatsappProvider,
          baseUrl: settings.evolutionBaseUrl,
          apiKey: settings.evolutionApiKey,
          instance: settings.evolutionInstance,
          webhookUrl: settings.evolutionWebhookUrl || settings.webhookUrl,
          autoLinkTickets: settings.autoLinkTickets,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook,
          uazapiBaseUrl: settings.uazapiBaseUrl,
          uazapiSubdomain: settings.uazapiSubdomain,
          uazapiToken,
          uazapiAdminToken,
          uazapiTransport: settings.uazapiTransport
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar QR Code");

      setConnectionStatus(String(json?.data?.status?.instance?.status || json?.data?.status?.instance?.state || json?.data?.status?.state || "desconhecido"));
      setQrCode(typeof json?.data?.qrCode === "string" ? json.data.qrCode : null);
      setPairingCode(typeof json?.data?.pairingCode === "string" ? json.data.pairingCode : null);
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao testar conexão.", "error");
    } finally {
      setLoadingQr(false);
      setTestingApi(false);
    }
  }, [settings, showToast]);

  return {
    settings,
    loading,
    updateSettings,
    fetchSettings,
    saveSettings,
    
    // Actions
    testSystemApi,
    testN8n,
    syncContacts,
    loadSyncedContacts,
    loadWebhookLogs,
    clearWebhookLogs,
    loadQr,

    // Loading states
    testingApi,
    testingN8n,
    syncingContacts,
    loadingContacts,
    loadingQr,
    loadingWebhookLogs,

    // Data states
    n8nTestResult,
    contactsSyncResult,
    contacts,
    webhookLogs,
    qrCode,
    pairingCode,
    connectionStatus
  };
}
