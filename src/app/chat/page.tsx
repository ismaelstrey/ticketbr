"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ArchivedChatConversation, ChatContact, ChatMessage, ChatTicketLink } from "@/types/chat";
import { buildChatTimeline, mergeSeparators } from "@/lib/chatTimeline";
import { getPersistedBoolean, setPersistedBoolean } from "@/lib/persistedBoolean";
import { computeCurrentConversationCutoffMs, filterMessagesByCutoff } from "@/lib/chatHistoryVisibility";
import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";

const openConversationPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    transform: scale(0.96);
  }

  25% {
    box-shadow: 0 0 0 0.22rem rgba(99, 102, 241, 0.22);
    transform: scale(1);
  }

  100% {
    box-shadow: 0 0 0 0.55rem rgba(99, 102, 241, 0);
    transform: scale(0.96);
  }
`;

const chatBubbleIn = keyframes`
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

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

const ContactItem = styled.button<{ $active?: boolean; $open?: boolean }>`
  width: 100%;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  isolation: isolate;
  background: ${({ theme, $active, $open }) => ($active ? `${theme.colors.primary}14` : $open ? `${theme.colors.primary}08` : "transparent")};
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 0.55rem;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ theme, $open }) => ($open ? `inset 0 0 0 1px ${theme.colors.primary}18` : "none")};
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 10px 0 auto 0;
    height: calc(100% - 20px);
    width: 3px;
    border-radius: 999px;
    background: ${({ theme, $open }) => ($open ? `linear-gradient(180deg, ${theme.colors.primary}, ${theme.colors.status.purple})` : "transparent")};
    opacity: ${({ $open }) => ($open ? 0.9 : 0)};
  }

  &:hover {
    background: ${({ theme, $open }) => ($open ? `${theme.colors.primary}12` : theme.colors.surfaceAlt)};
    transform: translateX(1px);
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

const ContactNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
`;

const ContactName = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OpenConversationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.16rem 0.48rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}2f`};
  background: linear-gradient(135deg, ${({ theme }) => `${theme.colors.primary}16`}, ${({ theme }) => `${theme.colors.status.purple}12`});
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const OpenConversationDot = styled.span`
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 0 0 0 ${({ theme }) => `${theme.colors.primary}55`};
  animation: ${openConversationPulse} 1.8s ease-out infinite;
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

const AttendanceBar = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.65rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const AttendanceInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
`;

const AttendanceTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.86rem;
`;

const AttendanceHint = styled.small`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const AttendanceControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const InlineSelect = styled(Select)`
  min-width: 220px;
`;

const ComposerBlocked = styled.div`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const MessageList = styled.div<{ $fading?: boolean }>`
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: ${({ $fading }) => ($fading ? 0.55 : 1)};
  transition: opacity 180ms ease;

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
  animation: ${({ $animate }) => ($animate ? css`${chatBubbleIn} 220ms ease forwards` : "none")};
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

const SeparatorSecondary = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
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

function compareContactsByPriority(a: Pick<ChatContact, "hasOpenConversation" | "lastMessageAt" | "name">, b: Pick<ChatContact, "hasOpenConversation" | "lastMessageAt" | "name">) {
  if (Boolean(a.hasOpenConversation) !== Boolean(b.hasOpenConversation)) {
    return Number(Boolean(b.hasOpenConversation)) - Number(Boolean(a.hasOpenConversation));
  }

  const byLastMessage = String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""));
  if (byLastMessage !== 0) return byLastMessage;

  return a.name.localeCompare(b.name, "pt-BR");
}

function formatFinalizedAt(value: string | Date) {
  const dt = value instanceof Date ? value : new Date(value);
  const date = dt.toLocaleDateString("pt-BR");
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

const CHAT_SEPARATORS_STORAGE_KEY = "ticketbr-chat-separators-v1";
const CHAT_SHOW_ARCHIVED_STORAGE_KEY = "ticketbr-chat-show-archived-v1";

interface ChatAgent {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface ConversationAttendanceMeta {
  assignedTo: string | null;
  assignedUserName: string | null;
  humanActive: boolean;
  botActive: boolean;
}

export default function ChatPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [tickets, setTickets] = useState<Array<{ id: string; number: number; subject: string; companyId?: string | null; companyName?: string | null }>>([]);
  const [links, setLinks] = useState<ChatTicketLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [conversationAttendance, setConversationAttendance] = useState<ConversationAttendanceMeta | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [messagesOlderCursor, setMessagesOlderCursor] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [conversationSeparators, setConversationSeparators] = useState<Array<{ archivedId: string; closedAt: string; startAt: string | null; ticketNumber: number | null }>>([]);
  const [archivedConversations, setArchivedConversations] = useState<ArchivedChatConversation[]>([]);
  const [activeArchivedId, setActiveArchivedId] = useState("");
  const [finalizePreview, setFinalizePreview] = useState<null | { archivedId: string; closedAt: string; ticketNumber: number | null }>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedPreference, setShowArchivedPreference] = useState(false);
  const [messagesFading, setMessagesFading] = useState(false);
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
  const showArchivedTimerRef = useRef<number | null>(null);

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
  const isAssignedToMe = Boolean(conversationAttendance?.assignedTo && user?.id && conversationAttendance.assignedTo === user.id);
  const isAssignedToOther = Boolean(conversationAttendance?.assignedTo && user?.id && conversationAttendance.assignedTo !== user.id);
  const needsAttendanceStart = Boolean(!activeArchivedConversation && selectedContact?.hasOpenConversation && !conversationAttendance?.assignedTo);
  const canInteractWithConversation = Boolean(!activeArchivedConversation && (selectedContact?.hasOpenConversation ? isAssignedToMe : !isAssignedToOther));

  const conversationStorageKey = useMemo(() => {
    const id = resolveActiveWaChatId() ?? contactId;
    if (!id) return null;
    return `${channel}:${id}`;
  }, [channel, contactId, selectedContact?.conversationId, selectedContact?.phone]);

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

  const currentConversationCutoffMs = useMemo(() => {
    if (activeArchivedConversation) return null;
    if (showArchived) return null;
    return computeCurrentConversationCutoffMs(conversationSeparators);
  }, [activeArchivedConversation, conversationSeparators, showArchived]);

  const visibleMessages = useMemo(() => {
    if (activeArchivedConversation) return displayedMessages;
    return filterMessagesByCutoff(displayedMessages, currentConversationCutoffMs);
  }, [activeArchivedConversation, currentConversationCutoffMs, displayedMessages]);

  const timeline = useMemo(() => {
    if (activeArchivedConversation) {
      return displayedMessages.map((message) => ({ kind: "message" as const, message }));
    }
    const baseSeparators = showArchived ? conversationSeparators : [];
    const separators = finalizePreview ? baseSeparators.filter((s) => s.archivedId !== finalizePreview.archivedId) : baseSeparators;
    const items = buildChatTimeline(
      visibleMessages.map((m) => ({ id: String(m.id), createdAt: String(m.createdAt) })),
      separators.map((s) => ({ archivedId: s.archivedId, closedAt: s.closedAt, startAt: s.startAt, ticketNumber: s.ticketNumber }))
    );
    const byId = new Map(visibleMessages.map((m) => [String(m.id), m]));
    return items.map((item) => item.kind === "message"
      ? { kind: "message" as const, message: byId.get(item.message.id)! }
      : { kind: "separator" as const, id: item.id, closedAt: item.closedAt, startAt: item.startAt, ticketNumber: item.ticketNumber ?? null }
    );
  }, [activeArchivedConversation, conversationSeparators, displayedMessages, finalizePreview, showArchived, visibleMessages]);

  useEffect(() => {
    const persisted = getPersistedBoolean(CHAT_SHOW_ARCHIVED_STORAGE_KEY, false);
    setShowArchived(persisted);
    setShowArchivedPreference(persisted);
  }, []);

  useEffect(() => {
    if (!showArchived && activeArchivedId) {
      setActiveArchivedId("");
    }
  }, [activeArchivedId, showArchived]);

  const syncSeparatorsToStorage = useCallback((key: string, next: Array<{ archivedId: string; closedAt: string; startAt: string | null; ticketNumber: number | null }>) => {
    try {
      const raw = window.localStorage.getItem(CHAT_SEPARATORS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const nextAll = typeof parsed === "object" && parsed ? parsed as Record<string, any> : {};
      nextAll[key] = next;
      window.localStorage.setItem(CHAT_SEPARATORS_STORAGE_KEY, JSON.stringify(nextAll));
    } catch (error) {
      console.error("Failed to persist chat separators", error);
      showToast("Falha ao salvar separações do chat.", "error");
    }
  }, [showToast]);

  const loadSeparatorsFromStorage = useCallback((key: string) => {
    try {
      const raw = window.localStorage.getItem(CHAT_SEPARATORS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const all = typeof parsed === "object" && parsed ? parsed as Record<string, unknown> : {};
      const value = all[key];
      if (!Array.isArray(value)) return [];
      return value
        .map((item) => ({
          archivedId: String((item as any)?.archivedId || ""),
          closedAt: String((item as any)?.closedAt || ""),
          startAt: (item as any)?.startAt ? String((item as any).startAt) : null,
          ticketNumber: typeof (item as any)?.ticketNumber === "number" ? Number((item as any).ticketNumber) : null
        }))
        .filter((item) => item.archivedId && item.closedAt);
    } catch (error) {
      console.error("Failed to load chat separators", error);
      return [];
    }
  }, []);

  const upsertSeparators = useCallback((incoming: Array<{ archivedId: string; closedAt: string; startAt: string | null; ticketNumber: number | null }>) => {
    setConversationSeparators((current) => {
      const merged = mergeSeparators(current, incoming).map((item) => ({
        archivedId: item.archivedId,
        closedAt: item.closedAt,
        startAt: item.startAt ? item.startAt : null,
        ticketNumber: typeof item.ticketNumber === "number" ? item.ticketNumber : null
      }));
      if (conversationStorageKey) {
        syncSeparatorsToStorage(conversationStorageKey, merged);
      }
      return merged;
    });
  }, [conversationStorageKey, syncSeparatorsToStorage]);

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
    return contacts
      .filter((contact) => {
        const companyPass = companyTab === "all" || (contact.company || "Sem empresa") === companyTab;
        const q = search.trim().toLowerCase();
        const searchPass = !q || contact.name.toLowerCase().includes(q) || (contact.company || "").toLowerCase().includes(q);

        const channelPass = channel === "whatsapp"
          ? Boolean(contact.hasWhatsApp)
          : Boolean(contact.email && contact.email.trim());

        return companyPass && searchPass && channelPass;
      })
      .sort(compareContactsByPriority);
  }, [contacts, companyTab, search, channel]);

  const updateSelectedContactOpenConversation = useCallback((hasOpenConversation: boolean) => {
    if (!contactId) return;

    setContacts((current) => current.map((contact) => contact.id === contactId
      ? { ...contact, hasOpenConversation }
      : contact));
  }, [contactId]);

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
      if (contact.company) params.set("companyName", contact.company);
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
    setConversationAttendance({
      assignedTo: json?.meta?.assignedTo ? String(json.meta.assignedTo) : null,
      assignedUserName: json?.meta?.assignedUserName ? String(json.meta.assignedUserName) : null,
      humanActive: Boolean(json?.meta?.humanActive),
      botActive: Boolean(json?.meta?.botActive)
    });

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
    if (!showArchived) return;
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
    if (!showArchived) return;
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
  }, [activeArchivedConversation, activeArchivedId, contactId, loadOlderMessages, loadingOlderMessages, messages.length, messagesOlderCursor, showArchived, showToast]);

  useEffect(() => {
    return () => {
      if (scrollLoadRafRef.current !== null) {
        window.cancelAnimationFrame(scrollLoadRafRef.current);
      }
      if (showArchivedTimerRef.current) {
        window.clearTimeout(showArchivedTimerRef.current);
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
    const list = Array.isArray(json.data) ? json.data : [];
    setArchivedConversations(list);
    if (conversationStorageKey) {
      const incoming = list
        .filter((item: any) => item?.id && item?.closedAt)
        .map((item: any) => ({
          archivedId: String(item.id),
          closedAt: new Date(item.closedAt).toISOString(),
          startAt: item?.nextStartedAt ? new Date(item.nextStartedAt).toISOString() : null,
          ticketNumber: typeof item?.ticket?.number === "number" ? Number(item.ticket.number) : null
        }));
      upsertSeparators(incoming);
    }
  }

  async function loadAgents() {
    const res = await fetch("/api/chat/agents", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar atendentes");
    setAgents(Array.isArray(json.data) ? json.data : []);
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
      loadInteractionPreferences(),
      loadAgents()
    ]).catch((error) => showToast(error.message, "error"));
  }, []);

  useEffect(() => {
    if (!contactId) return;
    setActiveArchivedId("");
    setFinalizePreview(null);
    setMessages([]);
    setMessagesOlderCursor(null);
    setConversationAttendance(null);
    setTransferTargetUserId("");
    setConversationSeparators([]);
    lastMessageIdRef.current = null;
    loadMessages({ reset: true }).catch((error) => showToast(error.message, "error"));
    loadLinks().catch((error) => showToast(error.message, "error"));
    loadArchivedConversations().catch((error) => showToast(error.message, "error"));
  }, [contactId, channel]);

  useEffect(() => {
    if (!conversationStorageKey) return;
    const stored = loadSeparatorsFromStorage(conversationStorageKey);
    if (stored.length) {
      upsertSeparators(stored);
    }
  }, [conversationStorageKey, loadSeparatorsFromStorage, upsertSeparators]);

  useEffect(() => {
    if (activeArchivedId) setFinalizePreview(null);
  }, [activeArchivedId]);

  useEffect(() => {
    if (!contactId || activeArchivedId) return;
    const timer = setInterval(() => loadMessages().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [contactId, channel, selectedContact?.phone, enableSound, enableAlert, activeArchivedId]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBase().catch(() => undefined);
    }, 10000);
    return () => clearInterval(timer);
  }, [channel]);

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
    if (!canInteractWithConversation) {
      showToast(needsAttendanceStart ? "Inicie o atendimento antes de responder" : "Esta conversa está com outro atendente", "error");
      return;
    }
    const waChatId = resolveActiveWaChatId();
    const phone = selectedContact?.phone || (waChatId ? waChatId.split("@")[0] : (contactId.includes("@") ? contactId.split("@")[0] : contactId));
    const trimmedText = text.trim();
    const outboundText = trimmedText
      ? `${user?.name || "Atendente"}: ${trimmedText}`
      : text;

    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: waChatId ?? contactId,
        channel,
        text: outboundText,
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

  async function claimConversation() {
    const waChatId = resolveActiveWaChatId();
    if (!waChatId) {
      showToast("Conversa inválida para iniciar atendimento", "error");
      return;
    }

    setAttendanceBusy(true);
    try {
      const res = await fetch("/api/chat/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", waChatId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao iniciar atendimento");

      setConversationAttendance({
        assignedTo: json?.data?.assignedTo ? String(json.data.assignedTo) : user?.id ?? null,
        assignedUserName: json?.data?.assignedUserName ? String(json.data.assignedUserName) : user?.name ?? "Atendente",
        humanActive: Boolean(json?.data?.humanActive ?? true),
        botActive: Boolean(json?.data?.botActive ?? false)
      });
      updateSelectedContactOpenConversation(true);
      showToast("Atendimento iniciado com sucesso", "success");
      await loadBase();
    } finally {
      setAttendanceBusy(false);
    }
  }

  async function transferConversation() {
    const waChatId = resolveActiveWaChatId();
    if (!waChatId || !transferTargetUserId) {
      showToast("Selecione o atendente de destino", "error");
      return;
    }

    setAttendanceBusy(true);
    try {
      const res = await fetch("/api/chat/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer", waChatId, targetUserId: transferTargetUserId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao transferir atendimento");

      setConversationAttendance({
        assignedTo: json?.data?.assignedTo ? String(json.data.assignedTo) : transferTargetUserId,
        assignedUserName: json?.data?.assignedUserName ? String(json.data.assignedUserName) : null,
        humanActive: Boolean(json?.data?.humanActive ?? true),
        botActive: Boolean(json?.data?.botActive ?? false)
      });
      setTransferTargetUserId("");
      showToast("Atendimento transferido com sucesso", "success");
      await loadBase();
    } finally {
      setAttendanceBusy(false);
    }
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
      updateSelectedContactOpenConversation(false);
      const archivedId = json?.data?.id ? String(json.data.id) : "";
      const closedAt = String(json?.data?.closedAt || new Date().toISOString());
      const ticketNumber = typeof json?.data?.ticket?.number === "number"
        ? Number(json.data.ticket.number)
        : (selectedTicket ? (tickets.find((t) => t.id === selectedTicket)?.number ?? null) : null);

      if (archivedId) {
        setFinalizePreview({ archivedId, closedAt, ticketNumber });
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
        upsertSeparators([{ archivedId, closedAt: new Date(closedAt).toISOString(), startAt: null, ticketNumber }]);
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

  async function returnToCurrentConversation() {
    if (!activeArchivedConversation) {
      setActiveArchivedId("");
      return;
    }

    try {
      const res = await fetch("/api/chat/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeArchivedConversation.contactId,
          channel: activeArchivedConversation.channel
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao marcar início de nova conversa");

      const data = json?.data;
      if (data?.id && data?.nextStartedAt) {
        const id = String(data.id);
        const closedAt = data?.closedAt ? new Date(data.closedAt).toISOString() : activeArchivedConversation.closedAt;
        const startAt = new Date(data.nextStartedAt).toISOString();
        const existingTicketNumber = conversationSeparators.find((s) => s.archivedId === id)?.ticketNumber ?? null;
        upsertSeparators([{ archivedId: id, closedAt, startAt, ticketNumber: existingTicketNumber }]);
      }

      updateSelectedContactOpenConversation(true);
    } finally {
      setActiveArchivedId("");
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

  function setShowArchivedPersisted(next: boolean) {
    setShowArchivedPreference(next);
    const ok = setPersistedBoolean(CHAT_SHOW_ARCHIVED_STORAGE_KEY, next);
    if (!ok) {
      showToast("Falha ao salvar preferência de conversas anteriores.", "error");
    }

    setMessagesFading(true);
    if (showArchivedTimerRef.current) {
      window.clearTimeout(showArchivedTimerRef.current);
    }
    showArchivedTimerRef.current = window.setTimeout(() => {
      setShowArchived(next);
      setMessagesFading(false);
    }, 160);
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
                    $open={Boolean(contact.hasOpenConversation)}
                  >
                    <Avatar>{contact.name.slice(0, 2).toUpperCase()}</Avatar>
                    <ContactBody>
                      <ContactNameRow>
                        <ContactName>{contact.name}</ContactName>
                        {contact.hasOpenConversation ? (
                          <OpenConversationBadge title="Conversa em aberto">
                            <OpenConversationDot /> Em aberto
                          </OpenConversationBadge>
                        ) : null}
                      </ContactNameRow>
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
                <ChatActionsMenu
                  showArchived={showArchivedPreference}
                  onToggleShowArchived={setShowArchivedPersisted}
                  enableAlert={enableAlert}
                  onRequestAlertPermission={requestBrowserAlertPermission}
                  enableSound={enableSound}
                  onToggleSound={setEnableSound}
                />
                {activeArchivedConversation ? <Chip>Histórico</Chip> : null}
              </HeaderActions>
            </Header>

            {!activeArchivedConversation && selectedContact ? (
              <AttendanceBar>
                <AttendanceInfo>
                  <AttendanceTitle>
                    {isAssignedToMe
                      ? "Você está atendendo esta conversa"
                      : conversationAttendance?.assignedUserName
                        ? `Em atendimento por ${conversationAttendance.assignedUserName}`
                        : selectedContact.hasOpenConversation
                          ? "Conversa em aberto aguardando atendimento"
                          : "Conversa disponível"}
                  </AttendanceTitle>
                  <AttendanceHint>
                    {isAssignedToMe
                      ? "Somente você pode responder até transferir o atendimento."
                      : conversationAttendance?.assignedUserName
                        ? "Outros atendentes ficam bloqueados até a conversa ser transferida."
                        : selectedContact.hasOpenConversation
                          ? "Clique em iniciar atendimento para assumir a conversa."
                          : "Ao responder, esta conversa poderá ser assumida por um atendente."}
                  </AttendanceHint>
                </AttendanceInfo>
                <AttendanceControls>
                  {needsAttendanceStart ? (
                    <Button type="button" disabled={attendanceBusy} onClick={() => claimConversation().catch((error) => showToast(error.message, "error"))}>
                      {attendanceBusy ? "Iniciando..." : "Iniciar atendimento"}
                    </Button>
                  ) : null}
                  {isAssignedToMe ? (
                    <>
                      <InlineSelect value={transferTargetUserId} onChange={(e) => setTransferTargetUserId(e.target.value)}>
                        <option value="">Transferir para...</option>
                        {agents
                          .filter((agent) => agent.id !== user?.id)
                          .map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                      </InlineSelect>
                      <Button type="button" variant="ghost" disabled={attendanceBusy || !transferTargetUserId} onClick={() => transferConversation().catch((error) => showToast(error.message, "error"))}>
                        {attendanceBusy ? "Transferindo..." : "Transferir"}
                      </Button>
                    </>
                  ) : null}
                </AttendanceControls>
              </AttendanceBar>
            ) : null}

            <MessageList ref={messageListRef} onScroll={onMessageListScroll} $fading={messagesFading}>
              {!activeArchivedConversation && showArchived && messagesOlderCursor ? (
                <LoadMoreButton
                  type="button"
                  disabled={loadingOlderMessages}
                  onClick={() => loadOlderMessages().catch((error) => showToast(error.message, "error"))}
                >
                  {loadingOlderMessages ? "Carregando..." : "Carregar mensagens anteriores"}
                </LoadMoreButton>
              ) : null}
              {timeline.map((item) => item.kind === "message" ? (
                <Bubble key={item.message.id} $in={item.message.direction === "in"} $animate={!activeArchivedConversation && item.message.id === animatedMessageId}>
                  {item.message.text ? <div>{item.message.text}</div> : null}
                  {item.message.attachment ? (
                    <a href={item.message.attachment.data ? `data:${item.message.attachment.mimeType};base64,${item.message.attachment.data}` : item.message.attachment.url} target="_blank" rel="noreferrer">
                      📎 {item.message.attachment.name}
                    </a>
                  ) : null}
                  <MessageMeta>{new Date(item.message.createdAt).toLocaleString("pt-BR")}</MessageMeta>
                </Bubble>
              ) : (
                <ConversationSeparator key={`sep_${item.id}`}>
                  <SeparatorLine />
                  <SeparatorLabel>
                    <span>Finalizada em {formatFinalizedAt(item.closedAt)}</span>
                    {item.startAt ? (
                      <SeparatorSecondary>Nova conversa iniciada em {formatFinalizedAt(item.startAt)}</SeparatorSecondary>
                    ) : null}
                    {typeof item.ticketNumber === "number" ? (
                      <TicketLabel>Ticket #{item.ticketNumber}</TicketLabel>
                    ) : null}
                  </SeparatorLabel>
                  <SeparatorLine />
                </ConversationSeparator>
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
                <Button variant="ghost" onClick={() => returnToCurrentConversation().catch((error) => showToast(error.message, "error"))}>Voltar para conversa atual</Button>
              </ArchiveBanner>
            ) : canInteractWithConversation ? (
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
            ) : (
              <ComposerBlocked>
                <span>
                  {needsAttendanceStart
                    ? "Clique em iniciar atendimento para assumir esta conversa antes de responder."
                    : `Esta conversa está em atendimento por ${conversationAttendance?.assignedUserName || "outro atendente"}.`}
                </span>
                {needsAttendanceStart ? (
                  <Button type="button" disabled={attendanceBusy} onClick={() => claimConversation().catch((error) => showToast(error.message, "error"))}>
                    {attendanceBusy ? "Iniciando..." : "Iniciar atendimento"}
                  </Button>
                ) : null}
              </ComposerBlocked>
            )}

            <Footer>
              <Select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)}>
                <option value="">Associar a um ticket...</option>
                {filteredTickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>#{ticket.number} - {ticket.subject}</option>
                ))}
              </Select>
              <Button variant="save" onClick={() => linkToTicket().catch((error) => showToast(error.message, "error"))}>Associar</Button>

              {showArchived ? (
                <Select value={activeArchivedId} onChange={(e) => setActiveArchivedId(e.target.value)}>
                  <option value="">Abrir conversa finalizada...</option>
                  {archivedConversations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {new Date(item.closedAt).toLocaleString("pt-BR")} {item.ticket ? `• Ticket #${item.ticket.number}` : ""}
                    </option>
                  ))}
                </Select>
              ) : (
                <div />
              )}
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
