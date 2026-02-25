"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { ChatContact, ChatMessage, ChatTicketLink } from "@/types/chat";

const Shell = styled.div`
  min-height: 100vh;
  background: #ece5dd;
`;

const Main = styled.main`
  margin-left: 260px;
  padding: 0.75rem;

  @media (max-width: 1024px) {
    margin-left: 64px;
  }
`;

const Frame = styled.div`
  height: calc(100vh - 1.5rem);
  background: #fff;
  border: 1px solid #d7d7d7;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 380px 1fr;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const SidebarPane = styled.aside`
  border-right: 1px solid #e5e7eb;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  background: #f8f9fa;
`;

const TopBar = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Tabs = styled.div`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 0.4rem;
  overflow: auto;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? "#22c55e" : "#d1d5db")};
  background: ${({ $active }) => ($active ? "#dcfce7" : "#fff")};
  color: ${({ $active }) => ($active ? "#166534" : "#374151")};
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.82rem;
  white-space: nowrap;
`;

const ContactList = styled.div`
  overflow: auto;
`;

const ContactItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-bottom: 1px solid #eceff1;
  background: ${({ $active }) => ($active ? "#ebf8ff" : "#fff")};
  padding: 0.65rem 0.75rem;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 0.55rem;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
`;

const Avatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #c7d2fe;
  color: #312e81;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
`;

const Chips = styled.div`
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
`;

const Chip = styled.span`
  font-size: 0.7rem;
  background: #ecfeff;
  border: 1px solid #a5f3fc;
  color: #0f766e;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
`;

const ChatPane = styled.section`
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  background: #efeae2;
`;

const Header = styled.div`
  background: #f0f2f5;
  border-bottom: 1px solid #d1d5db;
  padding: 0.6rem 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const MessageList = styled.div`
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Bubble = styled.div<{ $in?: boolean }>`
  align-self: ${({ $in }) => ($in ? "flex-start" : "flex-end")};
  background: ${({ $in }) => ($in ? "#fff" : "#dcf8c6")};
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  max-width: 72%;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.12);
`;

const Composer = styled.div`
  background: #f0f2f5;
  border-top: 1px solid #d1d5db;
  padding: 0.6rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
`;

const Footer = styled.div`
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 0.6rem;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.45rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.split(",").pop() ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function playNotificationTone() {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 860;
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

export default function ChatPage() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [links, setLinks] = useState<ChatTicketLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactId, setContactId] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [search, setSearch] = useState("");
  const [companyTab, setCompanyTab] = useState("all");
  const [text, setText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [enableSound, setEnableSound] = useState(true);
  const [enableAlert, setEnableAlert] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);

  const selectedContact = useMemo(() => contacts.find((c) => c.id === contactId), [contacts, contactId]);

  const companyTabs = useMemo(() => {
    const companies = Array.from(new Set(contacts.map((c) => c.company || "Sem empresa")));
    return ["all", ...companies];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const companyPass = companyTab === "all" || (contact.company || "Sem empresa") === companyTab;
      const q = search.trim().toLowerCase();
      const searchPass = !q || contact.name.toLowerCase().includes(q) || (contact.company || "").toLowerCase().includes(q);
      return companyPass && searchPass;
    });
  }, [contacts, companyTab, search]);

  async function loadBase() {
    const [contactsRes, ticketsRes] = await Promise.all([fetch("/api/chat/contacts"), fetch("/api/chat/tickets")]);
    const contactsJson = await contactsRes.json();
    const ticketsJson = await ticketsRes.json();

    if (!contactsRes.ok) throw new Error(contactsJson?.error || "Erro ao carregar contatos");
    if (!ticketsRes.ok) throw new Error(ticketsJson?.error || "Erro ao carregar tickets");

    const nextContacts = Array.isArray(contactsJson.data) ? contactsJson.data : [];
    setContacts(nextContacts);
    setTickets(Array.isArray(ticketsJson.data) ? ticketsJson.data : []);

    if (!contactId && nextContacts.length) {
      setContactId(nextContacts[0].id);
      setConversationId(`whatsapp:${nextContacts[0].id}`);
    }
  }

  async function loadMessages() {
    if (!contactId) return;
    const params = new URLSearchParams({ contactId, channel, contactPhone: selectedContact?.phone ?? "" });
    const res = await fetch(`/api/chat/messages?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar mensagens");

    const nextMessages = Array.isArray(json.data) ? json.data : [];
    const previousLast = lastMessageIdRef.current;
    const currentLast = nextMessages.at(-1)?.id ?? null;

    if (previousLast && currentLast && previousLast !== currentLast) {
      const latest = nextMessages.at(-1);
      if (latest?.direction === "in") {
        if (enableSound) playNotificationTone();
        if (enableAlert && "Notification" in window && Notification.permission === "granted") {
          new Notification(`Nova mensagem de ${selectedContact?.name ?? "cliente"}`, { body: latest.text ?? "Nova mensagem" });
        }
        showToast("Nova mensagem recebida", "success");
      }
    }

    lastMessageIdRef.current = currentLast;
    setMessages(nextMessages);
  }

  async function loadLinks() {
    if (!contactId) return;
    const res = await fetch(`/api/chat/links?contactId=${contactId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar vínculos");
    setLinks(Array.isArray(json.data) ? json.data : []);
  }

  useEffect(() => {
    loadBase().catch((error) => showToast(error.message, "error"));
  }, []);

  useEffect(() => {
    if (!contactId) return;
    loadMessages().catch((error) => showToast(error.message, "error"));
    loadLinks().catch((error) => showToast(error.message, "error"));
  }, [contactId, channel]);

  useEffect(() => {
    if (!contactId) return;
    const timer = setInterval(() => loadMessages().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [contactId, channel, selectedContact?.phone, enableSound, enableAlert]);

  async function requestBrowserAlertPermission() {
    if (!("Notification" in window)) {
      showToast("Este navegador não suporta notificações", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEnableAlert(false);
      showToast("Permissão de notificação não concedida", "error");
      return;
    }
    setEnableAlert(true);
  }

  async function sendMessage() {
    if (!contactId || (!text.trim() && !attachment)) return;
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, channel, text, contactPhone: selectedContact?.phone, attachment })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao enviar mensagem");
    setText("");
    setAttachment(null);
    await loadMessages();
  }

  async function linkToTicket() {
    if (!selectedTicket || !contactId || !conversationId.trim()) {
      showToast("Selecione o ticket e informe o id da conversa", "error");
      return;
    }
    const res = await fetch("/api/chat/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicket, contactId, channel, conversationId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao associar conversa");
    showToast("Conversa vinculada ao ticket", "success");
    await loadLinks();
  }

  return (
    <Shell>
      <Sidebar />
      <Main>
        <Frame>
          <SidebarPane>
            <TopBar>
              <strong>Conversas</strong>
              <Select value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </Select>
            </TopBar>
            <div style={{ padding: "0.6rem 0.75rem" }}>
              <Input placeholder="Buscar contato ou empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Tabs>
              {companyTabs.map((tab) => (
                <TabButton key={tab} $active={companyTab === tab} onClick={() => setCompanyTab(tab)}>
                  {tab === "all" ? "Todos" : tab}
                </TabButton>
              ))}
            </Tabs>

            <ContactList>
              {filteredContacts.map((contact) => {
                const last = messages.filter((m) => m.contactId === contact.id).at(-1);
                return (
                  <ContactItem
                    key={contact.id}
                    $active={contact.id === contactId}
                    onClick={() => {
                      setContactId(contact.id);
                      setConversationId(`whatsapp:${contact.id}`);
                    }}
                  >
                    <Avatar>{contact.name.slice(0, 2).toUpperCase()}</Avatar>
                    <div>
                      <div style={{ fontWeight: 700 }}>{contact.name}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>{contact.company || "Sem empresa"}</div>
                      <div style={{ color: "#4b5563", fontSize: "0.77rem", marginTop: 2 }}>{last?.text || contact.phone || contact.email || "Sem mensagens"}</div>
                      <Chips>
                        {(contact.tags || []).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                      </Chips>
                    </div>
                    <small style={{ color: "#6b7280" }}>{last ? new Date(last.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                  </ContactItem>
                );
              })}
            </ContactList>
          </SidebarPane>

          <ChatPane>
            <Header>
              <div>
                <strong>{selectedContact?.name ?? "Selecione um contato"}</strong>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{selectedContact?.company || selectedContact?.phone || selectedContact?.email || ""}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label><input type="checkbox" checked={enableSound} onChange={(e) => setEnableSound(e.target.checked)} /> Som</label>
                <Button variant="ghost" onClick={requestBrowserAlertPermission}>Ativar alerta</Button>
              </div>
            </Header>

            <MessageList>
              {messages.map((message) => (
                <Bubble key={message.id} $in={message.direction === "in"}>
                  {message.text ? <div>{message.text}</div> : null}
                  {message.attachment ? (
                    <a href={message.attachment.data ? `data:${message.attachment.mimeType};base64,${message.attachment.data}` : message.attachment.url} target="_blank" rel="noreferrer">
                      📎 {message.attachment.name}
                    </a>
                  ) : null}
                  <div style={{ marginTop: 4, fontSize: "0.7rem", opacity: 0.7 }}>{new Date(message.createdAt).toLocaleString("pt-BR")}</div>
                </Bubble>
              ))}
              {!messages.length && <small style={{ color: "#6b7280" }}>Nenhuma mensagem ainda.</small>}
            </MessageList>

            <Composer>
              <Textarea placeholder="Digite uma mensagem" value={text} onChange={(e) => setText(e.target.value)} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const data = await toBase64(file);
                      setAttachment({ name: file.name, mimeType: file.type || "application/octet-stream", data });
                    }}
                  />
                  <Button variant="ghost" type="button">Anexar</Button>
                </label>
                <Button onClick={() => sendMessage().catch((error) => showToast(error.message, "error"))}>Enviar</Button>
              </div>
            </Composer>

            <Footer>
              <Select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)}>
                <option value="">Associar a um ticket...</option>
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>#{ticket.number} - {ticket.subject}</option>
                ))}
              </Select>
              <Input placeholder="ID da conversa" value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
              <Button variant="save" onClick={() => linkToTicket().catch((error) => showToast(error.message, "error"))}>Associar</Button>
            </Footer>
          </ChatPane>
        </Frame>
      </Main>
    </Shell>
  );
}
