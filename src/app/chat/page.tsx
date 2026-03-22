"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { ArchivedChatConversation, ChatContact, ChatMessage, ChatTicketLink } from "@/types/chat";

const ChatMain = styled(MainContent)`
  padding: 0;
  height: 100vh;
`;

const Frame = styled.div`
  width: 100%;
  height: 100vh;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: none;
  border-radius: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: 380px 1fr;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const SidebarPane = styled.aside`
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.surfaceAlt}, ${({ theme }) => theme.colors.surface});
`;

const TopBar = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`;

const SearchWrap = styled.div`
  padding: 0.6rem 0.75rem;
`;

const Tabs = styled.div`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 0.4rem;
  overflow: auto;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.82rem;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContactList = styled.div`
  overflow: auto;
`;

const ContactItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}14` : "transparent")};
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 0.55rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const Avatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.status.purple});
  color: ${({ theme }) => theme.colors.text.white};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
`;

const ContactBody = styled.div`
  min-width: 0;
`;

const ContactName = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ContactMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.78rem;
`;

const ContactPreview = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.77rem;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ContactTime = styled.small`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.75rem;
`;

const Chips = styled.div`
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
`;

const Chip = styled.span`
  font-size: 0.7rem;
  background: ${({ theme }) => `${theme.colors.status.info}18`};
  border: 1px solid ${({ theme }) => `${theme.colors.status.info}40`};
  color: ${({ theme }) => theme.colors.status.info};
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
`;

const ChatPane = styled.section`
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 30%),
    ${({ theme }) => theme.colors.background};
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.75rem 0.9rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  backdrop-filter: blur(16px);
`;

const HeaderTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HeaderSubtitle = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MessageList = styled.div`
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const LoadMoreButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  align-self: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Bubble = styled.div<{ $in?: boolean; $animate?: boolean }>`
  align-self: ${({ $in }) => ($in ? "flex-start" : "flex-end")};
  background: ${({ theme, $in }) => ($in ? theme.colors.surface : `${theme.colors.primary}22`)};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme, $in }) => ($in ? theme.colors.border : `${theme.colors.primary}35`)};
  border-radius: 16px;
  padding: 0.6rem 0.75rem;
  max-width: 72%;
  box-shadow: ${({ theme }) => theme.shadows.card};
  opacity: ${({ $animate }) => ($animate ? 0 : 1)};
  transform: ${({ $animate }) => ($animate ? "translateY(6px) scale(0.995)" : "translateY(0) scale(1)")};
  animation: ${({ $animate }) => ($animate ? "chatBubbleIn 220ms ease forwards" : "none")};

  @keyframes chatBubbleIn {
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const MessageMeta = styled.div`
  margin-top: 4px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyState = styled.small`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ConversationSeparator = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
  opacity: 0;
  transform: translateY(6px);
  animation: chatSeparatorIn 220ms ease forwards;

  @keyframes chatSeparatorIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SeparatorLine = styled.div`
  height: 1px;
  width: 100%;
  background: ${({ theme }) => theme.colors.border};
`;

const SeparatorLabel = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
`;

const TicketLabel = styled.span`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
`;

const Composer = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
`;

const ComposerActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ArchiveBanner = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ArchiveText = styled.small`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.75rem;
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

function formatFinalizedAt(value: string | Date) {
  const dt = value instanceof Date ? value : new Date(value);
  const date = dt.toLocaleDateString("pt-BR");
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

export default function ChatPage() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [tickets, setTickets] = useState<Array<{ id: string; number: number; subject: string; companyId?: string | null; companyName?: string | null }>>([]);
  const [links, setLinks] = useState<ChatTicketLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesOlderCursor, setMessagesOlderCursor] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<ArchivedChatConversation[]>([]);
  const [activeArchivedId, setActiveArchivedId] = useState("");
  const [finalizePreview, setFinalizePreview] = useState<null | { archivedId: string; closedAt: string; ticketNumber: number | null }>(null);
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [savingConversation, setSavingConversation] = useState(false);
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
  const messageListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const preferencesLoadedRef = useRef(false);
  const preferencesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoScrollRef = useRef(false);
  const scrollLoadRafRef = useRef<number | null>(null);

  const selectedContact = useMemo(() => contacts.find((c) => c.id === contactId), [contacts, contactId]);

  function resolveActiveWaChatId() {
    if (channel !== "whatsapp") return null;
    const fromContact = selectedContact?.conversationId ? String(selectedContact.conversationId) : "";
    if (fromContact.includes("@")) return fromContact;
    if (String(contactId).includes("@")) return String(contactId);
    const phoneDigits = String(selectedContact?.phone || "").replace(/\D/g, "");
    if (phoneDigits) return `${phoneDigits}@s.whatsapp.net`;
    return null;
  }
  const activeArchivedConversation = useMemo(() => archivedConversations.find((item) => item.id === activeArchivedId), [archivedConversations, activeArchivedId]);

  const displayedMessages = useMemo(() => {
    if (!activeArchivedConversation) return messages;
    const base = (activeArchivedConversation.messages || []) as ChatMessage[];
    const copy = [...base];
    copy.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
    return copy;
  }, [activeArchivedConversation, messages]);

  const filteredTickets = useMemo(() => {
    if (!selectedContact) return tickets;
    if (selectedContact.companyId) {
      return tickets.filter((ticket) => ticket.companyId === selectedContact.companyId);
    }
    if (selectedContact.company) {
      const normalizedCompany = selectedContact.company.trim().toLowerCase();
      return tickets.filter((ticket) => String(ticket.companyName || "").trim().toLowerCase() === normalizedCompany);
    }
    return [];
  }, [tickets, selectedContact]);

  const companyTabs = useMemo(() => {
    const companies = Array.from(new Set(contacts.map((c) => c.company || "Sem empresa")));
    return ["all", ...companies];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const companyPass = companyTab === "all" || (contact.company || "Sem empresa") === companyTab;
      const q = search.trim().toLowerCase();
      const searchPass = !q || contact.name.toLowerCase().includes(q) || (contact.company || "").toLowerCase().includes(q);

      const channelPass = channel === "whatsapp"
        ? Boolean(contact.hasWhatsApp)
        : Boolean(contact.email && contact.email.trim());

      return companyPass && searchPass && channelPass;
    });
  }, [contacts, companyTab, search, channel]);

  async function loadBase() {
    const contactsRes = await fetch("/api/chat/contacts");

    const contactsJson = await contactsRes.json();

    if (!contactsRes.ok) throw new Error(contactsJson?.error || "Erro ao carregar contatos");

    const nextContacts = Array.isArray(contactsJson.data) ? contactsJson.data : [];
    setContacts(nextContacts);

    if (!contactId && nextContacts.length) {
      setContactId(nextContacts[0].id);
      setConversationId(nextContacts[0].conversationId || `whatsapp:${nextContacts[0].id}`);
    }
  }


  async function loadTicketsForContact(contact?: ChatContact) {
    if (!contact) {
      setTickets([]);
      return;
    }

    const params = new URLSearchParams();
    if (contact.companyId) {
      params.set("companyId", contact.companyId);
    } else if (contact.company) {
      params.set("companyName", contact.company);
    } else {
      setTickets([]);
      return;
    }

    const res = await fetch(`/api/chat/tickets?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar tickets");
    setTickets(Array.isArray(json.data) ? json.data : []);
  }

  function sortChatMessages(input: ChatMessage[]) {
    input.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  async function loadMessages(options?: { reset?: boolean }) {
    if (!contactId) return;
    if (activeArchivedId) return;
    const reset = Boolean(options?.reset);
    const fallbackPhone = selectedContact?.id.startsWith("wa:") ? selectedContact.id.replace("wa:", "") : "";
    const waChatId = resolveActiveWaChatId();
    const params = new URLSearchParams({ channel, contactPhone: selectedContact?.phone ?? fallbackPhone });
    if (waChatId) params.set("waChatId", waChatId);
    else params.set("contactId", contactId);
    params.set("limit", "50");
    const res = await fetch(`/api/chat/messages?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar mensagens");

    const nextMessages: ChatMessage[] = Array.isArray(json.data) ? (json.data as ChatMessage[]) : [];
    sortChatMessages(nextMessages);
    const nextCursor = String(json?.paging?.nextCursor || "") || null;

    const previousLast = lastMessageIdRef.current;
    const currentLast = nextMessages.at(-1)?.id ?? null;

    if (!reset && previousLast && currentLast && previousLast !== currentLast) {
      const latest = nextMessages.at(-1);
      if (latest?.direction === "in") {
        if (enableSound) playNotificationTone();
        if (enableAlert && "Notification" in window && Notification.permission === "granted") {
          new Notification(`Nova mensagem de ${selectedContact?.name ?? "cliente"}`, { body: latest.text ?? "Nova mensagem" });
        }
        showToast("Nova mensagem recebida", "success");
      }
      setAnimatedMessageId(String(currentLast));
      window.setTimeout(() => setAnimatedMessageId(null), 320);
    }

    lastMessageIdRef.current = currentLast;

    if (reset) {
      setMessagesOlderCursor(nextCursor);
      setMessages(nextMessages);
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
      return;
    }

    setMessages((current) => {
      if (!current.length) return nextMessages;
      const seen = new Set(current.map((m) => String(m.id)));
      const appended = nextMessages.filter((m) => !seen.has(String(m.id)));
      if (!appended.length) return current;
      return [...current, ...appended];
    });
  }

  async function loadOlderMessages() {
    if (!contactId) return;
    if (activeArchivedId || activeArchivedConversation) return;
    if (!messagesOlderCursor || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    skipAutoScrollRef.current = true;

    const container = messageListRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      const fallbackPhone = selectedContact?.id.startsWith("wa:") ? selectedContact.id.replace("wa:", "") : "";
      const waChatId = resolveActiveWaChatId();
      const params = new URLSearchParams({ channel, contactPhone: selectedContact?.phone ?? fallbackPhone });
      if (waChatId) params.set("waChatId", waChatId);
      else params.set("contactId", contactId);
      params.set("limit", "50");
      params.set("cursor", messagesOlderCursor);

      const res = await fetch(`/api/chat/messages?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar mensagens anteriores");

      const older = Array.isArray(json.data) ? (json.data as ChatMessage[]) : [];
      sortChatMessages(older);

      if (!older.length) {
        setMessagesOlderCursor(null);
        return;
      }

      setMessages((current) => {
        const seen = new Set(current.map((m) => String(m.id)));
        const prefix = older.filter((m) => !seen.has(String(m.id)));
        return prefix.length ? [...prefix, ...current] : current;
      });

      const nextCursor = String(json?.paging?.nextCursor || "") || null;
      setMessagesOlderCursor(nextCursor);

      requestAnimationFrame(() => {
        const el = messageListRef.current;
        if (!el) return;
        const nextScrollHeight = el.scrollHeight;
        el.scrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } finally {
      setLoadingOlderMessages(false);
      window.setTimeout(() => {
        skipAutoScrollRef.current = false;
      }, 0);
    }
  }

  const onMessageListScroll = useCallback(() => {
    if (!contactId) return;
    if (activeArchivedConversation || activeArchivedId) return;
    if (!messages.length) return;
    if (!messagesOlderCursor || loadingOlderMessages) return;

    const el = messageListRef.current;
    if (!el) return;

    if (el.scrollTop > 80) return;
    if (scrollLoadRafRef.current !== null) return;

    scrollLoadRafRef.current = window.requestAnimationFrame(() => {
      scrollLoadRafRef.current = null;
      loadOlderMessages().catch((error) => showToast(error.message, "error"));
    });
  }, [activeArchivedConversation, activeArchivedId, contactId, loadOlderMessages, loadingOlderMessages, messages.length, messagesOlderCursor, showToast]);

  useEffect(() => {
    return () => {
      if (scrollLoadRafRef.current !== null) {
        window.cancelAnimationFrame(scrollLoadRafRef.current);
      }
    };
  }, []);

  async function loadLinks() {
    if (!contactId) return;
    const waChatId = resolveActiveWaChatId();
    const id = waChatId ?? contactId;
    const res = await fetch(`/api/chat/links?contactId=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar vínculos");
    setLinks(Array.isArray(json.data) ? json.data : []);
  }

  async function loadArchivedConversations() {
    if (!contactId) {
      setArchivedConversations([]);
      return;
    }

    const waChatId = resolveActiveWaChatId();
    const params = new URLSearchParams({ contactId: waChatId ?? contactId, channel });
    const res = await fetch(`/api/chat/conversations?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar conversas finalizadas");
    setArchivedConversations(Array.isArray(json.data) ? json.data : []);
  }

  async function loadInteractionPreferences() {
    const res = await fetch("/api/chat/preferences", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar preferências do chat");

    if (json?.data) {
      setEnableSound(Boolean(json.data.enableSound));
      setEnableAlert(Boolean(json.data.enableAlert));
      setChannel(json.data.preferredChannel === "email" ? "email" : "whatsapp");
    }

    preferencesLoadedRef.current = true;
  }

  useEffect(() => {
    Promise.all([
      loadBase(),
      loadInteractionPreferences()
    ]).catch((error) => showToast(error.message, "error"));
  }, []);

  useEffect(() => {
    if (!contactId) return;
    setActiveArchivedId("");
    setFinalizePreview(null);
    setMessages([]);
    setMessagesOlderCursor(null);
    lastMessageIdRef.current = null;
    loadMessages({ reset: true }).catch((error) => showToast(error.message, "error"));
    loadLinks().catch((error) => showToast(error.message, "error"));
    loadArchivedConversations().catch((error) => showToast(error.message, "error"));
  }, [contactId, channel]);

  useEffect(() => {
    if (activeArchivedId) setFinalizePreview(null);
  }, [activeArchivedId]);

  useEffect(() => {
    if (!contactId || activeArchivedId) return;
    const timer = setInterval(() => loadMessages().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [contactId, channel, selectedContact?.phone, enableSound, enableAlert, activeArchivedId]);

  useEffect(() => {
    if (skipAutoScrollRef.current) return;
    if (activeArchivedConversation || finalizePreview) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const el = messageListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (distanceFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeArchivedConversation, finalizePreview]);

  useEffect(() => {
    if (!selectedTicket) return;
    const stillAvailable = tickets.some((ticket) => ticket.id === selectedTicket);
    if (!stillAvailable) {
      setSelectedTicket("");
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    loadTicketsForContact(selectedContact).catch((error) => showToast(error.message, "error"));
  }, [selectedContact?.id, selectedContact?.companyId, selectedContact?.company]);

  useEffect(() => {
    if (!filteredContacts.length) {
      setContactId("");
      return;
    }

    const stillVisible = filteredContacts.some((c) => c.id === contactId);
    if (!stillVisible) {
      setContactId(filteredContacts[0].id);
      setConversationId(filteredContacts[0].conversationId || `whatsapp:${filteredContacts[0].id}`);
    }
  }, [filteredContacts, contactId]);

  useEffect(() => {
    if (!preferencesLoadedRef.current) return;
    if (preferencesSaveTimerRef.current) clearTimeout(preferencesSaveTimerRef.current);

    preferencesSaveTimerRef.current = setTimeout(() => {
      fetch("/api/chat/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableSound, enableAlert, preferredChannel: channel })
      }).catch((error) => console.error("Failed to persist chat preferences", error));
    }, 300);

    return () => {
      if (preferencesSaveTimerRef.current) clearTimeout(preferencesSaveTimerRef.current);
    };
  }, [enableSound, enableAlert, channel]);

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
    const waChatId = resolveActiveWaChatId();
    const phone = selectedContact?.phone || (waChatId ? waChatId.split("@")[0] : (contactId.includes("@") ? contactId.split("@")[0] : contactId));

    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: waChatId ?? contactId,
        channel,
        text,
        contactPhone: phone,
        attachment
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao enviar mensagem");
    setText("");
    setAttachment(null);
    await loadMessages();
  }

  async function finalizeConversation() {
    if (!contactId) {
      showToast("Selecione um contato para finalizar", "error");
      return;
    }

    if (!messages.length) {
      showToast("Não há mensagens para salvar nesta conversa", "error");
      return;
    }

    setSavingConversation(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: resolveActiveWaChatId() ?? contactId,
          contactName: selectedContact?.name || "Contato",
          channel,
          conversationId: conversationId.trim() || `${channel}:${contactId}`,
          ticketId: selectedTicket || undefined,
          messages
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao finalizar conversa");

      showToast("Conversa finalizada e salva no histórico", "success");
      const archivedId = json?.data?.id ? String(json.data.id) : "";
      const closedAt = String(json?.data?.closedAt || new Date().toISOString());
      const ticketNumber = typeof json?.data?.ticket?.number === "number"
        ? Number(json.data.ticket.number)
        : (selectedTicket ? (tickets.find((t) => t.id === selectedTicket)?.number ?? null) : null);

      if (archivedId) {
        setFinalizePreview({ archivedId, closedAt, ticketNumber });
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
      }

      await loadArchivedConversations();
      if (archivedId) {
        window.setTimeout(() => {
          setFinalizePreview(null);
          setActiveArchivedId(archivedId);
        }, 450);
      }
    } finally {
      setSavingConversation(false);
    }
  }

  async function linkToTicket() {
    if (!selectedTicket || !contactId || !conversationId.trim()) {
      showToast("Selecione o ticket e informe o id da conversa", "error");
      return;
    }
    const res = await fetch("/api/chat/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicket, contactId: resolveActiveWaChatId() ?? contactId, channel, conversationId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao associar conversa");
    showToast("Conversa vinculada ao ticket", "success");
    await loadLinks();
  }

  return (
    <AppShellContainer>
      <Sidebar />
      <ChatMain>
        <Frame>
          <SidebarPane>
            <TopBar>
              <strong>Conversas</strong>
              <Select value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </Select>
            </TopBar>
            <SearchWrap>
              <Input placeholder="Buscar contato ou empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
            </SearchWrap>
            <Tabs>
              {companyTabs.map((tab) => (
                <TabButton key={tab} $active={companyTab === tab} onClick={() => setCompanyTab(tab)}>
                  {tab === "all" ? "Todos" : tab}
                </TabButton>
              ))}
            </Tabs>

            <ContactList>
              {filteredContacts.map((contact) => {
                const lastPreview = contact.lastMessagePreview || contact.phone || contact.email || "Sem mensagens";
                const lastAt = contact.lastMessageAt ? new Date(contact.lastMessageAt) : null;
                return (
                  <ContactItem
                    key={contact.id}
                    $active={contact.id === contactId}
                    onClick={() => {
                      setContactId(contact.id);
                      setConversationId(contact.conversationId || `whatsapp:${contact.id}`);
                    }}
                  >
                    <Avatar>{contact.name.slice(0, 2).toUpperCase()}</Avatar>
                    <ContactBody>
                      <ContactName>{contact.name}</ContactName>
                      <ContactMeta>{contact.company || "Sem empresa"}</ContactMeta>
                      <ContactPreview>{lastPreview}</ContactPreview>
                      <Chips>
                        {(contact.tags || []).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                      </Chips>
                    </ContactBody>
                    <ContactTime>{lastAt ? lastAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</ContactTime>
                  </ContactItem>
                );
              })}
            </ContactList>
          </SidebarPane>

          <ChatPane>
            <Header>
              <div>
                <HeaderTitle>{selectedContact?.name ?? "Selecione um contato"}</HeaderTitle>
                <HeaderSubtitle>{selectedContact?.company || selectedContact?.phone || selectedContact?.email || ""}</HeaderSubtitle>
              </div>
              <HeaderActions>
                <label><input type="checkbox" checked={enableSound} onChange={(e) => setEnableSound(e.target.checked)} /> Som</label>
                <Button variant="ghost" onClick={requestBrowserAlertPermission}>Ativar alerta</Button>
                {activeArchivedConversation ? <Chip>Histórico</Chip> : null}
              </HeaderActions>
            </Header>

            <MessageList ref={messageListRef} onScroll={onMessageListScroll}>
              {!activeArchivedConversation && messagesOlderCursor ? (
                <LoadMoreButton
                  type="button"
                  disabled={loadingOlderMessages}
                  onClick={() => loadOlderMessages().catch((error) => showToast(error.message, "error"))}
                >
                  {loadingOlderMessages ? "Carregando..." : "Carregar mensagens anteriores"}
                </LoadMoreButton>
              ) : null}
              {displayedMessages.map((message) => (
                <Bubble key={message.id} $in={message.direction === "in"} $animate={!activeArchivedConversation && message.id === animatedMessageId}>
                  {message.text ? <div>{message.text}</div> : null}
                  {message.attachment ? (
                    <a href={message.attachment.data ? `data:${message.attachment.mimeType};base64,${message.attachment.data}` : message.attachment.url} target="_blank" rel="noreferrer">
                      📎 {message.attachment.name}
                    </a>
                  ) : null}
                  <MessageMeta>{new Date(message.createdAt).toLocaleString("pt-BR")}</MessageMeta>
                </Bubble>
              ))}
              {activeArchivedConversation ? (
                <ConversationSeparator>
                  <SeparatorLine />
                  <SeparatorLabel>
                    {formatFinalizedAt(activeArchivedConversation.closedAt)}
                    {activeArchivedConversation.ticket ? (
                      <TicketLabel>Ticket #{activeArchivedConversation.ticket.number}</TicketLabel>
                    ) : null}
                  </SeparatorLabel>
                  <SeparatorLine />
                </ConversationSeparator>
              ) : null}
              {!activeArchivedConversation && finalizePreview ? (
                <ConversationSeparator>
                  <SeparatorLine />
                  <SeparatorLabel>
                    {formatFinalizedAt(finalizePreview.closedAt)}
                    {typeof finalizePreview.ticketNumber === "number" ? (
                      <TicketLabel>Ticket #{finalizePreview.ticketNumber}</TicketLabel>
                    ) : null}
                  </SeparatorLabel>
                  <SeparatorLine />
                </ConversationSeparator>
              ) : null}
              {!displayedMessages.length && <EmptyState>Nenhuma mensagem ainda.</EmptyState>}
              <div ref={messagesEndRef} />
            </MessageList>

            {activeArchivedConversation ? (
              <ArchiveBanner>
                <ArchiveText>Conversa finalizada</ArchiveText>
                <Button variant="ghost" onClick={() => setActiveArchivedId("")}>Voltar para conversa atual</Button>
              </ArchiveBanner>
            ) : (
              <Composer>
                <Textarea
                  placeholder="Digite uma mensagem (Enter para enviar, Ctrl+Enter para quebra de linha)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage().catch((error) => showToast(error.message, "error"));
                    }
                  }}
                />
                <ComposerActions>
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
                </ComposerActions>
              </Composer>
            )}

            <Footer>
              <Select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)}>
                <option value="">Associar a um ticket...</option>
                {filteredTickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>#{ticket.number} - {ticket.subject}</option>
                ))}
              </Select>
              <Input placeholder="ID da conversa" value={conversationId} onChange={(e) => setConversationId(e.target.value)} disabled />
              <Button variant="save" onClick={() => linkToTicket().catch((error) => showToast(error.message, "error"))}>Associar</Button>

              <Select value={activeArchivedId} onChange={(e) => setActiveArchivedId(e.target.value)}>
                <option value="">Abrir conversa finalizada...</option>
                {archivedConversations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {new Date(item.closedAt).toLocaleString("pt-BR")} {item.ticket ? `• Ticket #${item.ticket.number}` : ""}
                  </option>
                ))}
              </Select>
              <div />
              <Button
                variant="ghost"
                disabled={savingConversation || !contactId || !messages.length}
                onClick={() => finalizeConversation().catch((error) => showToast(error.message, "error"))}
              >
                {savingConversation ? "Finalizando..." : "Finalizar conversa"}
              </Button>
            </Footer>
          </ChatPane>
        </Frame>
      </ChatMain>
    </AppShellContainer>
  );
}
