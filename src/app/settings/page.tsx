"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

type TabKey = "general" | "evolution" | "n8n" | "contactsSync" | "notifications";

interface IntegrationSettings {
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
  n8nBaseUrl: string;
  n8nApiKey: string;
  n8nConversationsPath: string;
  n8nMessagesPath: string;
  n8nSendPath: string;
}

interface SyncedContact {
  id: string;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  instanceId: string | null;
}

const storageKey = "ticketbr:settings:integrations";
const defaults: IntegrationSettings = {
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
  n8nBaseUrl: "",
  n8nApiKey: "",
  n8nConversationsPath: "/conversations",
  n8nMessagesPath: "/messages",
  n8nSendPath: "/messages/send"
};

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

const ResultBox = styled.pre`
  margin-top: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.8rem;
  overflow-x: auto;
`;

const ContactsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.9rem;

  th,
  td {
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    padding: 0.55rem;
    font-size: 0.84rem;
    vertical-align: top;
  }

  th {
    color: #374151;
    font-weight: 700;
  }
`;

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [settings, setSettings] = useState<IntegrationSettings>(defaults);

  const [testingApi, setTestingApi] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [n8nTestResult, setN8nTestResult] = useState<unknown>(null);
  const [contactsSyncResult, setContactsSyncResult] = useState<unknown>(null);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);

  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("desconhecido");

  const tabs = useMemo(
    () => [
      { key: "general" as const, label: "Geral" },
      { key: "evolution" as const, label: "Evolution API" },
      { key: "n8n" as const, label: "N8N" },
      { key: "contactsSync" as const, label: "Sincronizar Contatos" },
      { key: "notifications" as const, label: "Notificações" }
    ],
    []
  );

  const update = (patch: Partial<IntegrationSettings>) => setSettings((curr) => ({ ...curr, ...patch }));

  const loadSyncedContacts = async () => {
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
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setSettings((curr) => ({ ...curr, ...(JSON.parse(saved) as IntegrationSettings) }));
    } catch {
      // ignore
    }

    fetch("/api/settings/whatsapp/config")
      .then((res) => res.json())
      .then((json) => {
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
            n8nBaseUrl: json.data.n8nBaseUrl ?? curr.n8nBaseUrl,
            n8nConversationsPath: json.data.n8nConversationsPath ?? curr.n8nConversationsPath,
            n8nMessagesPath: json.data.n8nMessagesPath ?? curr.n8nMessagesPath,
            n8nSendPath: json.data.n8nSendPath ?? curr.n8nSendPath
          }));
        }
      })
      .catch(() => undefined);

    loadSyncedContacts().catch(() => undefined);
  }, []);

  const saveSettings = async () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));

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
  };

  const testSystemApi = async () => {
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
  };

  const testN8n = async () => {
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
  };

  const syncContacts = async () => {
    try {
      setSyncingContacts(true);
      setContactsSyncResult(null);

      const res = await fetch("/api/settings/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n8nBaseUrl: settings.n8nBaseUrl,
          n8nApiKey: settings.n8nApiKey,
          n8nWebhookUrl: settings.n8nWebhookUrl
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
  };

  const loadQr = async () => {
    try {
      setTesting(true);
      setLastTest(null);

      const endpoint =
        activeTab === "evolution" ? "/api/settings/integrations/evolution/test" : "/api/settings/integrations/n8n/test";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.evolutionBaseUrl,
          apiKey: settings.evolutionApiKey,
          instance: settings.evolutionInstance,
          webhookUrl: settings.evolutionWebhookUrl || settings.webhookUrl,
          autoLinkTickets: settings.autoLinkTickets,
          n8nWebhookUrl: settings.n8nWebhookUrl
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar QR Code");

      setConnectionStatus(String(json?.data?.status?.instance?.state || json?.data?.status?.state || "desconhecido"));
      setQrCode(typeof json?.data?.qrCode === "string" ? json.data.qrCode : null);
      setPairingCode(typeof json?.data?.pairingCode === "string" ? json.data.pairingCode : null);
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
          <Info>Evolution API, N8N e sincronização de contatos WhatsApp em abas separadas.</Info>

          <Tabs>
            {tabs.map((tab) => (
              <TabButton key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </Tabs>

          {activeTab === "evolution" && (
            <div>
              <h3>Geral</h3>
              <Info>Valide a API local antes de testar integrações externas.</Info>
              <Footer>
                <Button variant="ghost" onClick={testSystemApi} disabled={testingApi}>
                  {testingApi ? "Testando..." : "Testar API"}
                </Button>
              </Footer>
            </div>
          )}

          {activeTab === "evolution" && (
            <div>
              <h3>Integração: Evolution API</h3>
              <FormGrid>
                <Field>
                  URL base
                  <Input placeholder="https://evo.exemplo.com" value={settings.evolutionBaseUrl} onChange={(e) => update({ evolutionBaseUrl: e.target.value })} />
                </Field>
                <Field>
                  Instância
                  <Input placeholder="ticketbr" value={settings.evolutionInstance} onChange={(e) => update({ evolutionInstance: e.target.value })} />
                </Field>
                <Field>
                  API Key
                  <Input type="password" value={settings.evolutionApiKey} onChange={(e) => update({ evolutionApiKey: e.target.value })} />
                </Field>
                <Field>
                  Webhook (entrada)
                  <Input placeholder="https://seu-dominio/api/chat/webhook" value={settings.evolutionWebhookUrl || settings.webhookUrl} onChange={(e) => update({ webhookUrl: e.target.value, evolutionWebhookUrl: e.target.value })} />
                </Field>
              </FormGrid>

              <label style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input type="checkbox" checked={settings.autoLinkTickets} onChange={(e) => update({ autoLinkTickets: e.target.checked })} />
                Associar automaticamente conversas a tickets
              </label>

              <Footer>
                <Button variant="save" onClick={() => saveSettings().catch((error) => showToast(error.message, "error"))}>Salvar Evolution</Button>
                <Button variant="primary" onClick={loadQr} disabled={loadingQr}>{loadingQr ? "Carregando QR..." : "Gerar/Atualizar QR"}</Button>
              </Footer>

              <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <strong>Status:</strong> {connectionStatus}
                {pairingCode ? <p><strong>Código:</strong> {pairingCode}</p> : null}
                {qrCode ? <img src={qrCode} alt="QR Code do WhatsApp" style={{ width: 280, maxWidth: "100%", border: "1px solid #e5e7eb", borderRadius: 8 }} /> : null}
              </div>
            </div>
          )}

          {activeTab === "n8n" && (
            <div>
              <h3>Integração: N8N</h3>
              <Info>Configure API do n8n e caminhos usados pelo chat. Para produção, prefira /webhook.</Info>

              <FormGrid>
                <Field>
                  URL do serviço
                  <Input placeholder="https://n8n.exemplo.com" value={settings.n8nBaseUrl} onChange={(e) => update({ n8nBaseUrl: e.target.value })} />
                </Field>
                <Field>
                  API Key
                  <Input type="password" value={settings.n8nApiKey} onChange={(e) => update({ n8nApiKey: e.target.value })} />
                </Field>
                <Field>
                  Webhook de eventos
                  <Input placeholder="https://n8n.exemplo.com/webhook/messages" value={settings.n8nWebhookUrl} onChange={(e) => update({ n8nWebhookUrl: e.target.value })} />
                </Field>
                <Field>
                  Path conversa (GET)
                  <Input value={settings.n8nConversationsPath} onChange={(e) => update({ n8nConversationsPath: e.target.value })} />
                </Field>
                <Field>
                  Path mensagens (GET)
                  <Input value={settings.n8nMessagesPath} onChange={(e) => update({ n8nMessagesPath: e.target.value })} />
                </Field>
                <Field>
                  Path envio (POST)
                  <Input value={settings.n8nSendPath} onChange={(e) => update({ n8nSendPath: e.target.value })} />
                </Field>
              </FormGrid>

              <Footer>
                <Button variant="save" onClick={() => saveSettings().catch((error) => showToast(error.message, "error"))}>Salvar N8N</Button>
                <Button variant="ghost" onClick={testN8n} disabled={testingN8n}>{testingN8n ? "Testando..." : "Testar comunicação com N8N"}</Button>
              </Footer>

              {n8nTestResult ? <ResultBox>{JSON.stringify(n8nTestResult, null, 2)}</ResultBox> : null}
            </div>
          )}

          {activeTab === "contactsSync" && (
            <div>
              <h3>Sincronização de contatos WhatsApp</h3>
              <Info>
                Esta ação chama o endpoint do n8n baseado na sua configuração e adiciona <code>/todos/contatos</code> para buscar todos os contatos e salvar na base local.
              </Info>

              <Footer>
                <Button variant="save" onClick={() => saveSettings().catch((error) => showToast(error.message, "error"))}>Salvar configurações</Button>
                <Button variant="primary" onClick={syncContacts} disabled={syncingContacts}>{syncingContacts ? "Sincronizando..." : "Sincronizar contatos"}</Button>
                <Button variant="ghost" onClick={loadSyncedContacts} disabled={loadingContacts}>{loadingContacts ? "Carregando..." : "Atualizar lista"}</Button>
              </Footer>

              {contactsSyncResult ? <ResultBox>{JSON.stringify(contactsSyncResult, null, 2)}</ResultBox> : null}

              <ContactsTable>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>remoteJid</th>
                    <th>instanceId</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.pushName || "Sem nome"}</td>
                      <td>{contact.remoteJid}</td>
                      <td>{contact.instanceId || "-"}</td>
                      <td>{new Date(contact.updatedAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                  {!contacts.length ? (
                    <tr>
                      <td colSpan={4} style={{ color: "#6b7280" }}>Nenhum contato sincronizado ainda.</td>
                    </tr>
                  ) : null}
                </tbody>
              </ContactsTable>
            </div>
          )}

          {activeTab === "n8n" && (
            <div>
              <h3>Notificações</h3>
              <Info>Espaço reservado para alertas.</Info>
            </div>
          )}
        </Card>
      </Main>
    </Shell>
  );
}
