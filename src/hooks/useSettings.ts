import { useState, useCallback } from "react";
import { useToast } from "@/context/ToastContext";

export interface IntegrationSettings {
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

export const defaultSettings: IntegrationSettings = {
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
  n8nSendPath: "/messages/send"
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

  // Resultados
  const [n8nTestResult, setN8nTestResult] = useState<unknown>(null);
  const [contactsSyncResult, setContactsSyncResult] = useState<unknown>(null);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);
  
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
          n8nSendPath: json.data.n8nSendPath ?? curr.n8nSendPath
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
      const res = await fetch("/api/settings/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          n8nSendPath: settings.n8nSendPath
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

      const res = await fetch("/api/settings/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n8nBaseUrl: settings.n8nBaseUrl,
          n8nApiKey: settings.n8nApiKey,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook
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

  const loadQr = useCallback(async () => {
    try {
      setLoadingQr(true);
      setTestingApi(true); // compatibilidade visual
      const res = await fetch("/api/settings/whatsapp/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.evolutionBaseUrl,
          apiKey: settings.evolutionApiKey,
          instance: settings.evolutionInstance,
          webhookUrl: settings.evolutionWebhookUrl || settings.webhookUrl,
          autoLinkTickets: settings.autoLinkTickets,
          n8nWebhookUrl: settings.n8nWebhookUrl,
          n8nUseTestWebhook: settings.n8nUseTestWebhook
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar QR Code");

      setConnectionStatus(String(json?.data?.status?.instance?.state || json?.data?.status?.state || "desconhecido"));
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
    loadQr,

    // Loading states
    testingApi,
    testingN8n,
    syncingContacts,
    loadingContacts,
    loadingQr,

    // Data states
    n8nTestResult,
    contactsSyncResult,
    contacts,
    qrCode,
    pairingCode,
    connectionStatus
  };
}
