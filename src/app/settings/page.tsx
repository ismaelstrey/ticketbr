"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSettings } from "@/hooks/useSettings";

type TabKey = "general" | "evolution" | "n8n" | "contactsSync" | "notifications";

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
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const {
    settings,
    updateSettings: update,
    fetchSettings,
    saveSettings,
    testSystemApi,
    testN8n,
    syncContacts,
    loadSyncedContacts,
    loadQr,
    testingApi,
    testingN8n,
    syncingContacts,
    loadingContacts,
    loadingQr,
    n8nTestResult,
    contactsSyncResult,
    contacts,
    qrCode,
    pairingCode,
    connectionStatus
  } = useSettings();

  useEffect(() => {
    fetchSettings();
    loadSyncedContacts();
  }, [fetchSettings, loadSyncedContacts]);

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

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
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
                <Button variant="save" onClick={() => saveSettings()}>Salvar Evolution</Button>
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
                  <Input placeholder="https://n8n.exemplo.com/webhook/ticketbr-events" value={settings.n8nWebhookUrl} onChange={(e) => update({ n8nWebhookUrl: e.target.value })} />
                </Field>

                <label style={{ display: "flex", gap: 8, marginTop: 4, gridColumn: "1 / -1" }}>
                  <input type="checkbox" checked={settings.n8nUseTestWebhook} onChange={(e) => update({ n8nUseTestWebhook: e.target.checked })} />
                  Usar Webhook de Teste (substitui /webhook/ por /webhook-test/)
                </label>

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
                <Button variant="save" onClick={() => saveSettings()}>Salvar N8N</Button>
                <Button variant="ghost" onClick={testN8n} disabled={testingN8n}>{testingN8n ? "Testando..." : "Testar comunicação com N8N"}</Button>
              </Footer>

              {n8nTestResult ? <ResultBox>{JSON.stringify(n8nTestResult, null, 2)}</ResultBox> : null}
            </div>
          )}

          {activeTab === "contactsSync" && (
            <div>
              <h3>Sincronização de contatos WhatsApp</h3>
              <Info>
                Esta ação chama o endpoint do n8n baseado na sua configuração e adiciona <code>{settings.n8nUseTestWebhook ? "/webhook-test" : "/webhook"}/todos/contatos</code> para buscar todos os contatos e salvar na base local.
              </Info>

              <Footer>
                <Button variant="save" onClick={() => saveSettings()}>Salvar configurações</Button>
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

          {activeTab === "notifications" && (
            <div>
              <h3>Notificações</h3>
              <Info>Espaço reservado para alertas.</Info>
            </div>
          )}
        </Card>
      </MainContent>
    </AppShellContainer>
  );
}
