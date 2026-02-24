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
  background: #f3f4f6;
`;

const Main = styled.main`
  margin-left: 260px;
  padding: 1rem;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;

  @media (max-width: 1024px) {
    margin-left: 64px;
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
`;

const ContactList = styled.div`
  max-height: 70vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ContactItem = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#fff")};
  padding: 0.65rem;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
`;

const ChatPane = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 0.75rem;
  min-height: 80vh;
`;

const MessageList = styled.div`
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Bubble = styled.div<{ $in?: boolean }>`
  align-self: ${({ $in }) => ($in ? "flex-start" : "flex-end")};
  background: ${({ $in }) => ($in ? "#fff" : "#dbeafe")};
  border: 1px solid ${({ $in }) => ($in ? "#e5e7eb" : "#93c5fd")};
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  max-width: 75%;
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
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.06;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
}

export default function ChatPage() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [links, setLinks] = useState<ChatTicketLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactId, setContactId] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [text, setText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [enableSound, setEnableSound] = useState(true);
  const [enableAlert, setEnableAlert] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);

  const selectedContact = useMemo(() => contacts.find((c) => c.id === contactId), [contacts, contactId]);

  async function loadBase() {
    const [contactsRes, ticketsRes] = await Promise.all([
      fetch("/api/chat/contacts"),
      fetch("/api/chat/tickets")
    ]);

    const contactsJson = await contactsRes.json();
    const ticketsJson = await ticketsRes.json();

    if (!contactsRes.ok) throw new Error(contactsJson?.error || "Erro ao carregar contatos");
    if (!ticketsRes.ok) throw new Error(ticketsJson?.error || "Erro ao carregar tickets");

    setContacts(Array.isArray(contactsJson.data) ? contactsJson.data : []);
    setTickets(Array.isArray(ticketsJson.data) ? ticketsJson.data : []);

    if (!contactId && contactsJson.data?.length) {
      setContactId(contactsJson.data[0].id);
      setConversationId(`whatsapp:${contactsJson.data[0].id}`);
    }
  }

  async function loadMessages() {
    if (!contactId) return;
    const params = new URLSearchParams({
      contactId,
      channel,
      contactPhone: selectedContact?.phone ?? ""
    });
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
        if (enableAlert && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(`Nova mensagem de ${selectedContact?.name ?? "cliente"}`, { body: latest.text ?? "Você recebeu uma nova mensagem" });
          }
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
    const timer = setInterval(() => {
      loadMessages().catch(() => undefined);
    }, 5000);

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
      body: JSON.stringify({
        contactId,
        channel,
        text,
        contactPhone: selectedContact?.phone,
        attachment
      })
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
      body: JSON.stringify({
        ticketId: selectedTicket,
        contactId,
        channel,
        conversationId
      })
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
        <Card>
          <h2 style={{ marginTop: 0 }}>Clientes cadastrados</h2>
          <ContactList>
            {contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                $active={contact.id === contactId}
                onClick={() => {
                  setContactId(contact.id);
                  setConversationId(`whatsapp:${contact.id}`);
                }}
              >
                <strong>{contact.name}</strong>
                <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>{contact.phone || contact.email}</div>
              </ContactItem>
            ))}
          </ContactList>
        </Card>

        <Card>
          <ChatPane>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Chat com {selectedContact?.name ?? "-"}</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label>
                  <input type="checkbox" checked={enableSound} onChange={(e) => setEnableSound(e.target.checked)} /> Som
                </label>
                <Button variant="ghost" onClick={requestBrowserAlertPermission}>Ativar alerta do navegador</Button>
                <Select value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                </Select>
              </div>
            </div>

            <MessageList>
              {messages.map((message) => (
                <Bubble key={message.id} $in={message.direction === "in"}>
                  {message.text ? <div>{message.text}</div> : null}
                  {message.attachment ? (
                    <a
                      href={message.attachment.data ? `data:${message.attachment.mimeType};base64,${message.attachment.data}` : message.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📎 {message.attachment.name}
                    </a>
                  ) : null}
                  <div style={{ marginTop: 4, fontSize: "0.72rem", opacity: 0.75 }}>
                    {new Date(message.createdAt).toLocaleString("pt-BR")}
                  </div>
                </Bubble>
              ))}
              {!messages.length && <small style={{ color: "#6b7280" }}>Nenhuma mensagem ainda.</small>}
            </MessageList>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
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
            </div>
            {attachment && <small>Anexo pronto: {attachment.name}</small>}

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
              <Select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)}>
                <option value="">Associar a um ticket...</option>
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>#{ticket.number} - {ticket.subject}</option>
                ))}
              </Select>
              <Input placeholder="ID da conversa (ex: whatsapp:5511999998888)" value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
              <Button variant="save" onClick={() => linkToTicket().catch((error) => showToast(error.message, "error"))}>Associar</Button>
            </div>

            <div>
              <strong>Conversas associadas:</strong>
              <ul>
                {links.map((link) => (
                  <li key={link.id}>#{link.ticketNumber} - {link.ticketSubject} ({link.channel})</li>
                ))}
                {!links.length && <li>Nenhuma associação.</li>}
              </ul>
            </div>
          </ChatPane>
        </Card>
      </Main>
    </Shell>
  );
}
