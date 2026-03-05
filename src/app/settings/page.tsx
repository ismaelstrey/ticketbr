"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

type TabKey = "evolution" | "n8n";

const Shell = styled.div`
  min-height: 100vh;
  background: #f3f4f6;
`;

const Main = styled.main`
  margin-left: 260px;
  padding: 1rem;

  @media (max-width: 1024px) {
    margin-left: 64px;
  }
`;

const Card = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#d1d5db")};
  background: ${({ $active }) => ($active ? "#dbeafe" : "#fff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#374151")};
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 0.75rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: #111827;
  font-size: 0.9rem;
`;

const FieldHint = styled.span`
  color: #6b7280;
  font-size: 0.82rem;
`;

const FieldError = styled.span`
  color: #b91c1c;
  font-size: 0.82rem;
`;

const Footer = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const Info = styled.p`
  margin: 0 0 1rem;
  color: #6b7280;
  font-size: 0.9rem;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`;

const Pill = styled.span<{ $tone: "neutral" | "success" | "error" | "warning" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-weight: 700;
  font-size: 0.8rem;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "#16a34a"
        : $tone === "error"
          ? "#dc2626"
          : $tone === "warning"
            ? "#d97706"
            : "#9ca3af"};
  background:
    ${({ $tone }) =>
      $tone === "success"
        ? "#dcfce7"
        : $tone === "error"
          ? "#fee2e2"
          : $tone === "warning"
            ? "#ffedd5"
            : "#f3f4f6"};
  color:
    ${({ $tone }) =>
      $tone === "success"
        ? "#14532d"
        : $tone === "error"
          ? "#7f1d1d"
          : $tone === "warning"
            ? "#7c2d12"
            : "#374151"};
`;

const HistoryList = styled.div`
  margin-top: 0.85rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const HistoryHeader = styled.div`
  padding: 0.7rem 0.9rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 800;
  color: #111827;
`;

const HistoryItem = styled.div`
  padding: 0.7rem 0.9rem;
  display: grid;
  grid-template-columns: 140px 90px 1fr;
  gap: 0.75rem;
  border-bottom: 1px solid #f3f4f6;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

interface IntegrationSettings {
  evolutionBaseUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  evolutionWebhookUrl: string;
  evolutionTimeoutMs: string;
  evolutionRetryEnabled: boolean;
  evolutionRetryMax: string;
  evolutionRetryDelayMs: string;
  evolutionLogEnabled: boolean;

  n8nBaseUrl: string;
  n8nApiKey: string;
  n8nWebhookUrl: string;
  n8nTimeoutMs: string;
  n8nRetryEnabled: boolean;
  n8nRetryMax: string;
  n8nRetryDelayMs: string;
  n8nLogEnabled: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

type TestResult = {
  ok: boolean;
  message: string;
  statusCode?: number;
  latencyMs?: number;
  testedAt: string;
};

const storageKey = "ticketbr:settings:integrations";
const historyEvolutionKey = "ticketbr:settings:integrations:test-history:evolution";
const historyN8nKey = "ticketbr:settings:integrations:test-history:n8n";

const defaultSettings: IntegrationSettings = {
  evolutionBaseUrl: "",
  evolutionApiKey: "",
  evolutionInstance: "",
  evolutionWebhookUrl: "",
  evolutionTimeoutMs: "15000",
  evolutionRetryEnabled: true,
  evolutionRetryMax: "2",
  evolutionRetryDelayMs: "750",
  evolutionLogEnabled: true,

  n8nBaseUrl: "",
  n8nApiKey: "",
  n8nWebhookUrl: "",
  n8nTimeoutMs: "15000",
  n8nRetryEnabled: true,
  n8nRetryMax: "2",
  n8nRetryDelayMs: "750",
  n8nLogEnabled: true
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isPositiveIntString(value: string) {
  return /^\d+$/.test(value.trim()) && Number(value) > 0;
}

function validateEvolution(settings: IntegrationSettings) {
  const errors: Record<string, string> = {};
  if (!trimUrl(settings.evolutionBaseUrl)) errors.evolutionBaseUrl = "Informe a URL do serviço.";
  if (!settings.evolutionApiKey.trim()) errors.evolutionApiKey = "Informe a API Key.";
  if (!settings.evolutionInstance.trim()) errors.evolutionInstance = "Informe o nome da instância.";
  if (!settings.evolutionWebhookUrl.trim()) errors.evolutionWebhookUrl = "Informe o endpoint de webhook.";
  if (!isPositiveIntString(settings.evolutionTimeoutMs)) errors.evolutionTimeoutMs = "Informe um timeout em ms (> 0).";
  if (settings.evolutionRetryEnabled) {
    if (!isPositiveIntString(settings.evolutionRetryMax)) errors.evolutionRetryMax = "Informe o número máximo de tentativas (> 0).";
    if (!isPositiveIntString(settings.evolutionRetryDelayMs)) errors.evolutionRetryDelayMs = "Informe o atraso entre tentativas em ms (> 0).";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateN8n(settings: IntegrationSettings) {
  const errors: Record<string, string> = {};
  if (!trimUrl(settings.n8nBaseUrl)) errors.n8nBaseUrl = "Informe a URL do serviço.";
  if (!settings.n8nWebhookUrl.trim()) errors.n8nWebhookUrl = "Informe o endpoint de webhook.";
  if (!isPositiveIntString(settings.n8nTimeoutMs)) errors.n8nTimeoutMs = "Informe um timeout em ms (> 0).";
  if (settings.n8nRetryEnabled) {
    if (!isPositiveIntString(settings.n8nRetryMax)) errors.n8nRetryMax = "Informe o número máximo de tentativas (> 0).";
    if (!isPositiveIntString(settings.n8nRetryDelayMs)) errors.n8nRetryDelayMs = "Informe o atraso entre tentativas em ms (> 0).";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

function readHistory(key: string): TestResult[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<TestResult[]>(localStorage.getItem(key));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter((item) => item && typeof item === "object").slice(0, 20);
}

function writeHistory(key: string, entry: TestResult) {
  if (typeof window === "undefined") return;
  const curr = readHistory(key);
  const next = [entry, ...curr].slice(0, 20);
  localStorage.setItem(key, JSON.stringify(next));
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("evolution");
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<TestResult | null>(null);
  const [historyEvolution, setHistoryEvolution] = useState<TestResult[]>([]);
  const [historyN8n, setHistoryN8n] = useState<TestResult[]>([]);
  const hydratedRef = useRef(false);
  const lastSavedAtRef = useRef<number>(0);

  const tabs = useMemo(
    () => [
      { key: "evolution" as const, label: "Evolution API" },
      { key: "n8n" as const, label: "N8N" }
    ],
    []
  );

  useEffect(() => {
    try {
      const saved = safeJsonParse<IntegrationSettings>(localStorage.getItem(storageKey));
      if (saved) setSettings((curr) => ({ ...curr, ...saved }));
    } catch {
      // keep defaults
    }

    fetch("/api/settings/whatsapp/config")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setSettings((curr) => ({
            ...curr,
            evolutionBaseUrl: json.data.baseUrl ?? curr.evolutionBaseUrl,
            evolutionInstance: json.data.instance ?? curr.evolutionInstance,
            evolutionWebhookUrl: json.data.webhookUrl ?? curr.evolutionWebhookUrl,
            evolutionTimeoutMs: json.data.evolutionTimeoutMs ? String(json.data.evolutionTimeoutMs) : curr.evolutionTimeoutMs,
            evolutionRetryEnabled: json.data.evolutionRetryEnabled ?? curr.evolutionRetryEnabled,
            evolutionRetryMax: json.data.evolutionRetryMax ? String(json.data.evolutionRetryMax) : curr.evolutionRetryMax,
            evolutionRetryDelayMs: json.data.evolutionRetryDelayMs ? String(json.data.evolutionRetryDelayMs) : curr.evolutionRetryDelayMs,
            evolutionLogEnabled: json.data.evolutionLogEnabled ?? curr.evolutionLogEnabled,

            n8nBaseUrl: json.data.n8nBaseUrl ?? curr.n8nBaseUrl,
            n8nWebhookUrl: json.data.n8nWebhookUrl ?? curr.n8nWebhookUrl,
            n8nTimeoutMs: json.data.n8nTimeoutMs ? String(json.data.n8nTimeoutMs) : curr.n8nTimeoutMs,
            n8nRetryEnabled: json.data.n8nRetryEnabled ?? curr.n8nRetryEnabled,
            n8nRetryMax: json.data.n8nRetryMax ? String(json.data.n8nRetryMax) : curr.n8nRetryMax,
            n8nRetryDelayMs: json.data.n8nRetryDelayMs ? String(json.data.n8nRetryDelayMs) : curr.n8nRetryDelayMs,
            n8nLogEnabled: json.data.n8nLogEnabled ?? curr.n8nLogEnabled
          }));
        }
      })
      .catch(() => undefined);

    setHistoryEvolution(readHistory(historyEvolutionKey));
    setHistoryN8n(readHistory(historyN8nKey));
    hydratedRef.current = true;
  }, []);

  const updateSettings = (patch: Partial<IntegrationSettings>) => {
    setSettings((curr) => ({ ...curr, ...patch }));
    setSaveState("idle");
  };

  const saveSettings = async () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    const res = await fetch("/api/settings/whatsapp/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: settings.evolutionBaseUrl,
        apiKey: settings.evolutionApiKey,
        instance: settings.evolutionInstance,
        webhookUrl: settings.evolutionWebhookUrl,

        evolutionTimeoutMs: Number(settings.evolutionTimeoutMs),
        evolutionRetryEnabled: settings.evolutionRetryEnabled,
        evolutionRetryMax: Number(settings.evolutionRetryMax),
        evolutionRetryDelayMs: Number(settings.evolutionRetryDelayMs),
        evolutionLogEnabled: settings.evolutionLogEnabled,

        n8nBaseUrl: settings.n8nBaseUrl,
        n8nApiKey: settings.n8nApiKey,
        n8nWebhookUrl: settings.n8nWebhookUrl,

        n8nTimeoutMs: Number(settings.n8nTimeoutMs),
        n8nRetryEnabled: settings.n8nRetryEnabled,
        n8nRetryMax: Number(settings.n8nRetryMax),
        n8nRetryDelayMs: Number(settings.n8nRetryDelayMs),
        n8nLogEnabled: settings.n8nLogEnabled
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || "Erro ao salvar configuração");
    }
  };

  const autoSaveIfReady = async () => {
    const evo = validateEvolution(settings);
    const n8n = validateN8n(settings);
    const hasAnyValid = evo.isValid || n8n.isValid;
    if (!hasAnyValid) return;

    try {
      setSaveState("saving");
      await saveSettings();
      setSaveState("saved");
      const now = Date.now();
      if (now - lastSavedAtRef.current > 6000) {
        lastSavedAtRef.current = now;
        showToast("Configurações salvas automaticamente.", "success");
      }
    } catch (error: any) {
      setSaveState("error");
    }
  };

  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      autoSaveIfReady().catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(handle);
  }, [settings]);

  const runConnectionTest = async () => {
    const activeValidation = activeTab === "evolution" ? validateEvolution(settings) : validateN8n(settings);
    if (!activeValidation.isValid) {
      showToast("Corrija os campos obrigatórios antes de testar.", "error");
      return;
    }

    try {
      setTesting(true);
      setLastTest(null);

      const endpoint =
        activeTab === "evolution" ? "/api/settings/integrations/evolution/test" : "/api/settings/integrations/n8n/test";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: activeTab === "evolution" ? settings.evolutionBaseUrl : settings.n8nBaseUrl,
          apiKey: activeTab === "evolution" ? settings.evolutionApiKey : settings.n8nApiKey,
          timeoutMs: activeTab === "evolution" ? Number(settings.evolutionTimeoutMs) : Number(settings.n8nTimeoutMs),
          retryEnabled: activeTab === "evolution" ? settings.evolutionRetryEnabled : settings.n8nRetryEnabled,
          retryMax: activeTab === "evolution" ? Number(settings.evolutionRetryMax) : Number(settings.n8nRetryMax),
          retryDelayMs: activeTab === "evolution" ? Number(settings.evolutionRetryDelayMs) : Number(settings.n8nRetryDelayMs),
          logEnabled: activeTab === "evolution" ? settings.evolutionLogEnabled : settings.n8nLogEnabled
        })
      });

      const json = await res.json().catch(() => ({}));
      const result: TestResult = {
        ok: Boolean(json?.ok),
        message: String(json?.message ?? (res.ok ? "Conexão testada com sucesso." : "Falha ao testar conexão.")),
        statusCode: typeof json?.statusCode === "number" ? json.statusCode : res.status,
        latencyMs: typeof json?.latencyMs === "number" ? json.latencyMs : undefined,
        testedAt: new Date().toISOString()
      };

      setLastTest(result);

      const historyKey = activeTab === "evolution" ? historyEvolutionKey : historyN8nKey;
      writeHistory(historyKey, result);
      if (activeTab === "evolution") setHistoryEvolution(readHistory(historyEvolutionKey));
      else setHistoryN8n(readHistory(historyN8nKey));

      showToast(result.message, result.ok ? "success" : "error");
    } catch (error: any) {
      const result: TestResult = {
        ok: false,
        message: error?.message ?? "Falha ao testar conexão.",
        testedAt: new Date().toISOString()
      };
      setLastTest(result);
      showToast(result.message, "error");
    } finally {
      setTesting(false);
    }
  };

  const currentValidation = activeTab === "evolution" ? validateEvolution(settings) : validateN8n(settings);

  return (
    <Shell>
      <Sidebar />
      <Main>
        <Card>
          <h1 style={{ margin: "0 0 0.35rem" }}>Configurações de Integração</h1>
          <Info>
            Configure Evolution API e N8N com autenticação via API Key, payloads em JSON e headers padrão: Evolution usa header <strong>apikey</strong> e N8N usa <strong>X-N8N-API-KEY</strong>.
          </Info>

          <Tabs>
            {tabs.map((tab) => (
              <TabButton key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </Tabs>

          {activeTab === "evolution" && (
            <div>
              <h3>Integração: Evolution API</h3>
              <Info>
                Padrão de credencial compatível com n8n-nodes-evolution-api: URL do servidor + API Key no header <strong>apikey</strong>. O teste de conexão executa um GET em <strong>/instance/fetchInstances</strong>.
              </Info>

              <FormGrid>
                <Field>
                  URL do serviço
                  <Input
                    placeholder="https://evolution.suaempresa.com"
                    value={settings.evolutionBaseUrl}
                    onChange={(e) => updateSettings({ evolutionBaseUrl: e.target.value })}
                  />
                  <FieldHint>Ex.: https://api.exemplo.com (sem / no final).</FieldHint>
                  {currentValidation.errors.evolutionBaseUrl ? <FieldError>{currentValidation.errors.evolutionBaseUrl}</FieldError> : null}
                </Field>

                <Field>
                  API Key
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={settings.evolutionApiKey}
                    onChange={(e) => updateSettings({ evolutionApiKey: e.target.value })}
                  />
                  <FieldHint>Enviada no header apikey (não é exibida após salvar).</FieldHint>
                  {currentValidation.errors.evolutionApiKey ? <FieldError>{currentValidation.errors.evolutionApiKey}</FieldError> : null}
                </Field>

                <Field>
                  Nome da instância
                  <Input
                    placeholder="ticketbr-instance"
                    value={settings.evolutionInstance}
                    onChange={(e) => updateSettings({ evolutionInstance: e.target.value })}
                  />
                  {currentValidation.errors.evolutionInstance ? <FieldError>{currentValidation.errors.evolutionInstance}</FieldError> : null}
                </Field>

                <Field>
                  Webhook (entrada)
                  <Input
                    placeholder="https://seu-dominio.com/api/chat/webhook"
                    value={settings.evolutionWebhookUrl}
                    onChange={(e) => updateSettings({ evolutionWebhookUrl: e.target.value })}
                  />
                  <FieldHint>Endpoint que a Evolution chamará para eventos/mensagens.</FieldHint>
                  {currentValidation.errors.evolutionWebhookUrl ? <FieldError>{currentValidation.errors.evolutionWebhookUrl}</FieldError> : null}
                </Field>

                <Field>
                  Timeout (ms)
                  <Input
                    inputMode="numeric"
                    placeholder="15000"
                    value={settings.evolutionTimeoutMs}
                    onChange={(e) => updateSettings({ evolutionTimeoutMs: e.target.value })}
                  />
                  {currentValidation.errors.evolutionTimeoutMs ? <FieldError>{currentValidation.errors.evolutionTimeoutMs}</FieldError> : null}
                </Field>

                <Field>
                  Logs de comunicação
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.evolutionLogEnabled}
                      onChange={(e) => updateSettings({ evolutionLogEnabled: e.target.checked })}
                    />
                    Habilitar
                  </label>
                  <FieldHint>Registra histórico de testes localmente para diagnóstico.</FieldHint>
                </Field>

                <Field>
                  Retry automático
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.evolutionRetryEnabled}
                      onChange={(e) => updateSettings({ evolutionRetryEnabled: e.target.checked })}
                    />
                    Habilitar
                  </label>
                </Field>

                <Field>
                  Máx. tentativas
                  <Input
                    inputMode="numeric"
                    placeholder="2"
                    value={settings.evolutionRetryMax}
                    onChange={(e) => updateSettings({ evolutionRetryMax: e.target.value })}
                    disabled={!settings.evolutionRetryEnabled}
                  />
                  {currentValidation.errors.evolutionRetryMax ? <FieldError>{currentValidation.errors.evolutionRetryMax}</FieldError> : null}
                </Field>

                <Field>
                  Atraso entre tentativas (ms)
                  <Input
                    inputMode="numeric"
                    placeholder="750"
                    value={settings.evolutionRetryDelayMs}
                    onChange={(e) => updateSettings({ evolutionRetryDelayMs: e.target.value })}
                    disabled={!settings.evolutionRetryEnabled}
                  />
                  {currentValidation.errors.evolutionRetryDelayMs ? <FieldError>{currentValidation.errors.evolutionRetryDelayMs}</FieldError> : null}
                </Field>
              </FormGrid>

              <StatusRow>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill $tone={saveState === "saved" ? "success" : saveState === "saving" ? "warning" : saveState === "error" ? "error" : "neutral"}>
                    {saveState === "saved"
                      ? "Salvo"
                      : saveState === "saving"
                        ? "Salvando..."
                        : saveState === "error"
                          ? "Falha ao salvar"
                          : "Não salvo"}
                  </Pill>
                  {lastTest ? (
                    <Pill $tone={lastTest.ok ? "success" : "error"}>
                      {lastTest.ok ? "Teste OK" : "Teste com erro"}
                      {typeof lastTest.latencyMs === "number" ? ` • ${lastTest.latencyMs}ms` : ""}
                    </Pill>
                  ) : null}
                </div>

                <Footer style={{ marginTop: 0 }}>
                  <Button variant="ghost" onClick={runConnectionTest} disabled={testing || !currentValidation.isValid}>
                    {testing ? "Testando..." : "Testar Conexão"}
                  </Button>
                </Footer>
              </StatusRow>

              <HistoryList>
                <HistoryHeader>Histórico de testes (Evolution)</HistoryHeader>
                {historyEvolution.length === 0 ? (
                  <div style={{ padding: "0.8rem 0.9rem", color: "#6b7280" }}>Nenhum teste executado ainda.</div>
                ) : (
                  historyEvolution.map((item) => (
                    <HistoryItem key={`${item.testedAt}-${item.ok ? "ok" : "err"}`}>
                      <div style={{ color: "#6b7280" }}>{new Date(item.testedAt).toLocaleString()}</div>
                      <div>
                        <Pill $tone={item.ok ? "success" : "error"}>{item.ok ? "OK" : "ERRO"}</Pill>
                      </div>
                      <div style={{ color: "#111827" }}>
                        {item.message}
                        {typeof item.statusCode === "number" ? ` (HTTP ${item.statusCode})` : ""}
                      </div>
                    </HistoryItem>
                  ))
                )}
              </HistoryList>
            </div>
          )}

          {activeTab === "n8n" && (
            <div>
              <h3>Integração: N8N</h3>
              <Info>
                Quando informada, a API Key é enviada no header <strong>X-N8N-API-KEY</strong>. Sem API Key, o teste valida <strong>/healthz/readiness</strong>; com API Key, valida <strong>/api/v1/workflows</strong>.
              </Info>

              <FormGrid>
                <Field>
                  URL do serviço
                  <Input
                    placeholder="https://n8n.suaempresa.com"
                    value={settings.n8nBaseUrl}
                    onChange={(e) => updateSettings({ n8nBaseUrl: e.target.value })}
                  />
                  <FieldHint>Ex.: https://n8n.exemplo.com (sem / no final).</FieldHint>
                  {currentValidation.errors.n8nBaseUrl ? <FieldError>{currentValidation.errors.n8nBaseUrl}</FieldError> : null}
                </Field>

                <Field>
                  API Key
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={settings.n8nApiKey}
                    onChange={(e) => updateSettings({ n8nApiKey: e.target.value })}
                  />
                  <FieldHint>
                    Opcional. Se informada, será enviada no header X-N8N-API-KEY. Sem API Key, o teste valida somente o endpoint /healthz/readiness.
                  </FieldHint>
                </Field>

                <Field>
                  Webhook (entrada)
                  <Input
                    placeholder="https://n8n.seudominio/webhook/ticketbr-chat"
                    value={settings.n8nWebhookUrl}
                    onChange={(e) => updateSettings({ n8nWebhookUrl: e.target.value })}
                  />
                  <FieldHint>Endpoint no N8N para receber eventos do TicketBR.</FieldHint>
                  {currentValidation.errors.n8nWebhookUrl ? <FieldError>{currentValidation.errors.n8nWebhookUrl}</FieldError> : null}
                </Field>

                <Field>
                  Timeout (ms)
                  <Input
                    inputMode="numeric"
                    placeholder="15000"
                    value={settings.n8nTimeoutMs}
                    onChange={(e) => updateSettings({ n8nTimeoutMs: e.target.value })}
                  />
                  {currentValidation.errors.n8nTimeoutMs ? <FieldError>{currentValidation.errors.n8nTimeoutMs}</FieldError> : null}
                </Field>

                <Field>
                  Logs de comunicação
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.n8nLogEnabled}
                      onChange={(e) => updateSettings({ n8nLogEnabled: e.target.checked })}
                    />
                    Habilitar
                  </label>
                  <FieldHint>Registra histórico de testes localmente para diagnóstico.</FieldHint>
                </Field>

                <Field>
                  Retry automático
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.n8nRetryEnabled}
                      onChange={(e) => updateSettings({ n8nRetryEnabled: e.target.checked })}
                    />
                    Habilitar
                  </label>
                </Field>

                <Field>
                  Máx. tentativas
                  <Input
                    inputMode="numeric"
                    placeholder="2"
                    value={settings.n8nRetryMax}
                    onChange={(e) => updateSettings({ n8nRetryMax: e.target.value })}
                    disabled={!settings.n8nRetryEnabled}
                  />
                  {currentValidation.errors.n8nRetryMax ? <FieldError>{currentValidation.errors.n8nRetryMax}</FieldError> : null}
                </Field>

                <Field>
                  Atraso entre tentativas (ms)
                  <Input
                    inputMode="numeric"
                    placeholder="750"
                    value={settings.n8nRetryDelayMs}
                    onChange={(e) => updateSettings({ n8nRetryDelayMs: e.target.value })}
                    disabled={!settings.n8nRetryEnabled}
                  />
                  {currentValidation.errors.n8nRetryDelayMs ? <FieldError>{currentValidation.errors.n8nRetryDelayMs}</FieldError> : null}
                </Field>
              </FormGrid>

              <StatusRow>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill $tone={saveState === "saved" ? "success" : saveState === "saving" ? "warning" : saveState === "error" ? "error" : "neutral"}>
                    {saveState === "saved"
                      ? "Salvo"
                      : saveState === "saving"
                        ? "Salvando..."
                        : saveState === "error"
                          ? "Falha ao salvar"
                          : "Não salvo"}
                  </Pill>
                  {lastTest ? (
                    <Pill $tone={lastTest.ok ? "success" : "error"}>
                      {lastTest.ok ? "Teste OK" : "Teste com erro"}
                      {typeof lastTest.latencyMs === "number" ? ` • ${lastTest.latencyMs}ms` : ""}
                    </Pill>
                  ) : null}
                </div>

                <Footer style={{ marginTop: 0 }}>
                  <Button variant="ghost" onClick={runConnectionTest} disabled={testing || !currentValidation.isValid}>
                    {testing ? "Testando..." : "Testar Conexão"}
                  </Button>
                </Footer>
              </StatusRow>

              <HistoryList>
                <HistoryHeader>Histórico de testes (N8N)</HistoryHeader>
                {historyN8n.length === 0 ? (
                  <div style={{ padding: "0.8rem 0.9rem", color: "#6b7280" }}>Nenhum teste executado ainda.</div>
                ) : (
                  historyN8n.map((item) => (
                    <HistoryItem key={`${item.testedAt}-${item.ok ? "ok" : "err"}`}>
                      <div style={{ color: "#6b7280" }}>{new Date(item.testedAt).toLocaleString()}</div>
                      <div>
                        <Pill $tone={item.ok ? "success" : "error"}>{item.ok ? "OK" : "ERRO"}</Pill>
                      </div>
                      <div style={{ color: "#111827" }}>
                        {item.message}
                        {typeof item.statusCode === "number" ? ` (HTTP ${item.statusCode})` : ""}
                      </div>
                    </HistoryItem>
                  ))
                )}
              </HistoryList>
            </div>
          )}
        </Card>
      </Main>
    </Shell>
  );
}
