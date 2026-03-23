export type ChatMessageLike = {
  id: string;
  createdAt: string;
};

export type ChatSeparatorLike = {
  archivedId: string;
  closedAt: string;
  startAt?: string | null;
  ticketNumber?: number | null;
};

export type ChatTimelineItem =
  | { kind: "message"; message: ChatMessageLike }
  | { kind: "separator"; id: string; closedAt: string; startAt?: string; ticketNumber?: number | null };

function compareIso(a: string, b: string) {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return a.localeCompare(b);
}

function compareByCreatedAtThenId(a: ChatMessageLike, b: ChatMessageLike) {
  const byTime = compareIso(a.createdAt, b.createdAt);
  if (byTime !== 0) return byTime;
  return String(a.id).localeCompare(String(b.id));
}

export function mergeSeparators(existing: ChatSeparatorLike[], incoming: ChatSeparatorLike[]) {
  const byId = new Map<string, ChatSeparatorLike>();
  for (const item of existing) {
    if (!item?.archivedId) continue;
    byId.set(item.archivedId, item);
  }
  for (const item of incoming) {
    if (!item?.archivedId) continue;
    const current = byId.get(item.archivedId);
    byId.set(item.archivedId, current ? { ...current, ...item } : item);
  }
  return Array.from(byId.values()).sort((a, b) => compareIso(a.closedAt, b.closedAt));
}

export function buildChatTimeline(messages: ChatMessageLike[], separators: ChatSeparatorLike[]): ChatTimelineItem[] {
  const sortedMessages = [...messages].sort(compareByCreatedAtThenId);
  const sortedSeparators = [...separators].sort((a, b) => compareIso(a.closedAt, b.closedAt));

  const timeline: ChatTimelineItem[] = [];
  let msgIndex = 0;

  for (const sep of sortedSeparators) {
    while (msgIndex < sortedMessages.length && compareIso(sortedMessages[msgIndex].createdAt, sep.closedAt) <= 0) {
      timeline.push({ kind: "message", message: sortedMessages[msgIndex] });
      msgIndex += 1;
    }

    const inferredStartAt = msgIndex < sortedMessages.length ? sortedMessages[msgIndex].createdAt : undefined;
    const startAt = sep.startAt ? sep.startAt : inferredStartAt;
    timeline.push({
      kind: "separator",
      id: sep.archivedId,
      closedAt: sep.closedAt,
      startAt,
      ticketNumber: sep.ticketNumber ?? null
    });
  }

  while (msgIndex < sortedMessages.length) {
    timeline.push({ kind: "message", message: sortedMessages[msgIndex] });
    msgIndex += 1;
  }

  return timeline;
}
