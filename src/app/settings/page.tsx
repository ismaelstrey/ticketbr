"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

type TabKey = "general" | "whatsapp" | "notifications";

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

interface WhatsAppSettings {
  evolutionBaseUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  webhookUrl: string;
  autoLinkTickets: boolean;
  n8nWebhookUrl: string;
}

const storageKey = "ticketbr:settings:whatsapp";

const defaultWhatsSettings: WhatsAppSettings = {
  evolutionBaseUrl: "",
  evolutionApiKey: "",
  evolutionInstance: "",
  webhookUrl: "",
  autoLinkTickets: true,
  n8nWebhookUrl: ""
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [whatsSettings, setWhatsSettings] = useState<WhatsAppSettings>(defaultWhatsSettings);
  const [testing, setTesting] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("desconhecido");

  const tabs = useMemo(
    () => [
      { key: "general" as const, label: "Geral" },
      { key: "whatsapp" as const, label: "WhatsApp (Evolution)" },
      { key: "notifications" as const, label: "Notificações" }
    ],
    []
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as WhatsAppSettings;
        setWhatsSettings({ ...defaultWhatsSettings, ...parsed });
      }
    } catch {
      // keep defaults
    }

    fetch("/api/settings/whatsapp/config")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setWhatsSettings((curr) => ({
            ...curr,
            evolutionBaseUrl: json.data.baseUrl ?? curr.evolutionBaseUrl,
            evolutionInstance: json.data.instance ?? curr.evolutionInstance,
            webhookUrl: json.data.webhookUrl ?? curr.webhookUrl,
            n8nWebhookUrl: json.data.n8nWebhookUrl ?? curr.n8nWebhookUrl
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  const updateWhats = (patch: Partial<WhatsAppSettings>) => {
    setWhatsSettings((curr) => ({ ...curr, ...patch }));
  };

  const saveWhatsSettings = async () => {
    localStorage.setItem(storageKey, JSON.stringify(whatsSettings));

    const res = await fetch("/api/settings/whatsapp/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: whatsSettings.evolutionBaseUrl,
        apiKey: whatsSettings.evolutionApiKey,
        instance: whatsSettings.evolutionInstance,
        webhookUrl: whatsSettings.webhookUrl,
        autoLinkTickets: whatsSettings.autoLinkTickets,
        n8nWebhookUrl: whatsSettings.n8nWebhookUrl
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || "Erro ao salvar configuração");
    }

    showToast("Configurações do WhatsApp salvas para esta sessão.", "success");
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const res = await fetch("/api/health");
      if (!res.ok) {
        throw new Error("Healthcheck falhou");
      }
      showToast("Teste executado com sucesso. API do sistema está online.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Falha ao testar integração", "error");
    } finally {
      setTesting(false);
    }
  };



  const loadWhatsQrCode = async () => {
    try {
      setLoadingQr(true);
      const res = await fetch("/api/settings/whatsapp/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: whatsSettings.evolutionBaseUrl,
          apiKey: whatsSettings.evolutionApiKey,
          instance: whatsSettings.evolutionInstance,
          webhookUrl: whatsSettings.webhookUrl,
          autoLinkTickets: whatsSettings.autoLinkTickets,
          n8nWebhookUrl: whatsSettings.n8nWebhookUrl
        })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Falha ao carregar QR Code");
      }

      const statusCandidate = json?.data?.status?.instance?.state || json?.data?.status?.state || "desconhecido";
      setConnectionStatus(String(statusCandidate));
      setQrCode(typeof json?.data?.qrCode === "string" ? json.data.qrCode : null);
      setPairingCode(typeof json?.data?.pairingCode === "string" ? json.data.pairingCode : null);

      if (!json?.data?.qrCode) {
        showToast("Instância pode já estar conectada. Nenhum QR Code retornado.", "success");
      }
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao buscar QR Code", "error");
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <Shell>
      <Sidebar />
      <Main>
        <Card>
          <h1 style={{ margin: "0 0 0.35rem" }}>Configurações do Sistema</h1>
          <Info>Use as abas para organizar as configurações. A aba de WhatsApp já está preparada para Evolution API.</Info>

          <Tabs>
            {tabs.map((tab) => (
              <TabButton key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </Tabs>

          {activeTab === "general" && (
            <div>
              <h3>Geral</h3>
              <Info>Espaço reservado para configurações globais do sistema (branding, regionalização e preferências).</Info>
            </div>
          )}

          {activeTab === "whatsapp" && (
            <div>
              <h3>Configurações do WhatsApp (Evolution API)</h3>
              <Info>Configure os dados de conexão com a Evolution API v2 e ajustes de comportamento do chat.</Info>

              <FormGrid>
                <Field>
                  URL base da Evolution API
                  <Input
                    placeholder="https://evolution.suaempresa.com"
                    value={whatsSettings.evolutionBaseUrl}
                    onChange={(e) => updateWhats({ evolutionBaseUrl: e.target.value })}
                  />
                </Field>

                <Field>
                  Nome da instância
                  <Input
                    placeholder="ticketbr-instance"
                    value={whatsSettings.evolutionInstance}
                    onChange={(e) => updateWhats({ evolutionInstance: e.target.value })}
                  />
                </Field>

                <Field>
                  API Key
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={whatsSettings.evolutionApiKey}
                    onChange={(e) => updateWhats({ evolutionApiKey: e.target.value })}
                  />
                </Field>

                <Field>
                  URL do webhook (entrada)
                  <Input
                    placeholder="https://seu-dominio.com/api/chat/webhook"
                    value={whatsSettings.webhookUrl}
                    onChange={(e) => updateWhats({ webhookUrl: e.target.value })}
                  />
                </Field>

                <Field>
                  Webhook do n8n (eventos)
                  <Input
                    placeholder="https://n8n.seudominio/webhook/ticketbr-chat"
                    value={whatsSettings.n8nWebhookUrl}
                    onChange={(e) => updateWhats({ n8nWebhookUrl: e.target.value })}
                  />
                </Field>
              </FormGrid>

              <label style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={whatsSettings.autoLinkTickets}
                  onChange={(e) => updateWhats({ autoLinkTickets: e.target.checked })}
                />
                Tentar associar automaticamente conversas a tickets existentes
              </label>

              <Footer>
                <Button variant="save" onClick={() => saveWhatsSettings().catch((error) => showToast(error.message, "error"))}>Salvar</Button>
                <Button variant="ghost" onClick={testConnection} disabled={testing}>
                  {testing ? "Testando..." : "Testar conexão"}
                </Button>
                <Button variant="primary" onClick={loadWhatsQrCode} disabled={loadingQr}>
                  {loadingQr ? "Carregando QR..." : "Gerar/Atualizar QR Code"}
                </Button>
              </Footer>

              <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <strong>Status da conexão:</strong> {connectionStatus}
                {pairingCode ? <p style={{ margin: "8px 0", color: "#374151" }}><strong>Código de pareamento:</strong> {pairingCode}</p> : null}
                {qrCode ? (
                  <div>
                    <p style={{ margin: "8px 0", color: "#374151" }}>Escaneie este QR Code no WhatsApp para vincular.</p>
                    <img src={qrCode} alt="QR Code do WhatsApp" style={{ width: 280, maxWidth: "100%", border: "1px solid #e5e7eb", borderRadius: 8 }} />
                  </div>
                ) : (
                  <p style={{ margin: "8px 0", color: "#6b7280" }}>Clique em "Gerar/Atualizar QR Code" para carregar o QR.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h3>Notificações</h3>
              <Info>Espaço reservado para políticas de alerta (som, pop-up, e-mail e SLA).</Info>
            </div>
          )}
        </Card>
      </Main>
    </Shell>
  );
}
