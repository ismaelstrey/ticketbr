export type ChatSeparatorWindow = {
  closedAt: string;
  startAt?: string | null;
};

export type ChatMessageWindow = {
  createdAt: string;
};

export function computeCurrentConversationCutoffMs(separators: ChatSeparatorWindow[]) {
  let bestClosed = -1;
  let bestStart: string | null = null;

  for (const sep of separators) {
    const closedTime = new Date(sep.closedAt).getTime();
    if (Number.isFinite(closedTime)) {
      if (closedTime > bestClosed) {
        bestClosed = closedTime;
        bestStart = sep.startAt ? String(sep.startAt) : null;
      }
    }
  }

  if (bestClosed >= 0) {
    if (bestStart) {
      const startTime = new Date(bestStart).getTime();
      if (Number.isFinite(startTime)) return startTime;
    }
    return bestClosed + 1;
  }
  return null;
}

export function filterMessagesByCutoff<T extends ChatMessageWindow>(messages: T[], cutoffMs: number | null) {
  if (cutoffMs === null) return messages;
  return messages.filter((m) => {
    const t = new Date(m.createdAt).getTime();
    return Number.isFinite(t) && t >= cutoffMs;
  });
}
