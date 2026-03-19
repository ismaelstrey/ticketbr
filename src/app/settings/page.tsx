"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useThemeMode } from "@/context/ThemeModeContext";
import { useSettings } from "@/hooks/useSettings";

type TabKey = "general" | "evolution" | "n8n" | "uazapi" | "contactsSync" | "notifications";

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  border-radius: 24px;
  padding: 1.25rem;
  backdrop-filter: blur(18px);
`;

const PageTitle = styled.h1`
  margin: 0 0 0.35rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
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
  color: ${({ theme }) => theme.colors.text.primary};
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
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.92rem;
  line-height: 1.55;
`;

const ResultBox = styled.pre`
  margin-top: 0.75rem;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 16px;
  padding: 0.9rem;
  font-size: 0.8rem;
  overflow-x: auto;
`;

const ContactsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.9rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  overflow: hidden;

  th,
  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    padding: 0.7rem;
    font-size: 0.84rem;
    vertical-align: top;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  th {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const ToggleCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.surfaceAlt}, ${({ theme }) => theme.colors.surface});
`;

const ToggleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ToggleTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.96rem;
`;

const ToggleDescription = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.88rem;
`;

const ThemeSwitch = styled.button<{ $active: boolean }>`
  width: 68px;
  height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surface)};
  border-radius: 999px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: ${({ $active }) => ($active ? "flex-end" : "flex-start")};
  transition: all 0.25s ease;

  span {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surfaceAlt)};
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: ${({ theme }) => theme.shadows.card};
    font-size: 0.9rem;
  }
`;

const StatusPanel = styled.div`
  margin-top: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: 20px;
  padding: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyCell = styled.td`
  color: ${({ theme }) => theme.colors.text.muted} !important;
`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const { isDark, toggleMode } = useThemeMode();

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
      { key: "uazapi" as const, label: "UAZAPI" },
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
          <PageTitle>Configurações de Integração</PageTitle>
          <Info>Evolution API, N8N, contatos WhatsApp e preferências visuais em um painel unificado.</Info>

          <Tabs>
            {tabs.map((tab) => (
              <TabButton key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </Tabs>

          {activeTab === "general" && (
            <div>
              <h3>Preferências da interface</h3>
              <Info>Ative o dark mode para aplicar contraste reforçado, superfícies mais elegantes e melhor leitura em toda a aplicação.</Info>

              <ToggleCard>
                <ToggleContent>
                  <ToggleTitle>Dark mode global</ToggleTitle>
                  <ToggleDescription>
                    Alterna todos os elementos do sistema entre uma paleta clara e uma paleta escura com contraste bem definido.
                  </ToggleDescription>
                </ToggleContent>
                <ThemeSwitch
                  type="button"
                  $active={isDark}
                  onClick={toggleMode}
                  aria-label={isDark ? "Desativar dark mode" : "Ativar dark mode"}
                  aria-pressed={isDark}
                >
                  <span>{isDark ? "🌙" : "☀️"}</span>
                </ThemeSwitch>
              </ToggleCard>

              <h3 style={{ marginTop: 24 }}>Canal WhatsApp</h3>
              <Info>Seleciona qual integração será usada como padrão para enviar mensagens no chat.</Info>

              <FormGrid>
                <Field>
                  Provider padrão
                  <Select value={settings.whatsappProvider} onChange={(e) => update({ whatsappProvider: e.target.value as any })}>
                    <option value="n8n">N8N</option>
                    <option value="evolution">Evolution</option>
                    <option value="uazapi">UAZAPI</option>
                  </Select>
                </Field>
              </FormGrid>

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

              <label style={{ display: "flex", gap: 8, marginTop: 12, color: "inherit" }}>
                <input type="checkbox" checked={settings.autoLinkTickets} onChange={(e) => update({ autoLinkTickets: e.target.checked })} />
                Associar automaticamente conversas a tickets
              </label>

              <Footer>
                <Button variant="save" onClick={() => saveSettings()}>Salvar Evolution</Button>
                <Button variant="primary" onClick={loadQr} disabled={loadingQr}>{loadingQr ? "Carregando QR..." : "Gerar/Atualizar QR"}</Button>
              </Footer>

              <StatusPanel>
                <strong>Status:</strong> {connectionStatus}
                {pairingCode ? <p><strong>Código:</strong> {pairingCode}</p> : null}
                {qrCode ? <img src={qrCode} alt="QR Code do WhatsApp" style={{ width: 280, maxWidth: "100%", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, marginTop: 12 }} /> : null}
              </StatusPanel>
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

                <label style={{ display: "flex", gap: 8, marginTop: 4, gridColumn: "1 / -1", color: "inherit" }}>
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
                <Field>
                  Path contatos (GET)
                  <Input value={settings.n8nContactsPath} onChange={(e) => update({ n8nContactsPath: e.target.value })} />
                </Field>
              </FormGrid>

              <Footer>
                <Button variant="save" onClick={() => saveSettings()}>Salvar N8N</Button>
                <Button variant="ghost" onClick={testN8n} disabled={testingN8n}>{testingN8n ? "Testando..." : "Testar comunicação com N8N"}</Button>
              </Footer>

              {n8nTestResult ? <ResultBox>{JSON.stringify(n8nTestResult, null, 2)}</ResultBox> : null}
            </div>
          )}

          {activeTab === "uazapi" && (
            <div>
              <h3>Integração: UAZAPI</h3>
              <Info>Configure a URL base e o token da instância (header token). Rotas administrativas usam admintoken.</Info>

              <FormGrid>
                <Field>
                  URL base (opcional)
                  <Input placeholder="https://api.uazapi.com" value={settings.uazapiBaseUrl} onChange={(e) => update({ uazapiBaseUrl: e.target.value })} />
                </Field>
                <Field>
                  Subdomínio (se URL base estiver vazia)
                  <Select value={settings.uazapiSubdomain} onChange={(e) => update({ uazapiSubdomain: e.target.value as any })}>
                    <option value="api">api</option>
                    <option value="free">free</option>
                  </Select>
                </Field>
                <Field>
                  Token da instância
                  <Input type="password" value={settings.uazapiToken} onChange={(e) => update({ uazapiToken: e.target.value })} />
                </Field>
                <Field>
                  Admin token (opcional)
                  <Input type="password" value={settings.uazapiAdminToken} onChange={(e) => update({ uazapiAdminToken: e.target.value })} />
                </Field>
                <Field>
                  Transporte padrão
                  <Select value={settings.uazapiTransport} onChange={(e) => update({ uazapiTransport: e.target.value as any })}>
                    <option value="rest">REST</option>
                    <option value="sse">SSE</option>
                    <option value="websocket">WebSocket</option>
                    <option value="graphql">GraphQL</option>
                  </Select>
                </Field>
              </FormGrid>

              <Footer>
                <Button variant="save" onClick={() => saveSettings()}>Salvar UAZAPI</Button>
              </Footer>
            </div>
          )}

          {activeTab === "contactsSync" && (
            <div>
              <h3>Sincronização de contatos WhatsApp</h3>
              <Info>
                Esta ação chama o endpoint do n8n baseado na configuração do Webhook de Eventos + <code>/wa/baileys/action/contacts</code> (ou fallback para o path configurado) para buscar contatos.
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
                      <EmptyCell colSpan={4}>Nenhum contato sincronizado ainda.</EmptyCell>
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
