ALTER TABLE "ChatConversation"
ADD COLUMN IF NOT EXISTS "nextStartedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ChatConversation_contactId_channel_nextStartedAt_idx"
ON "ChatConversation"("contactId", "channel", "nextStartedAt");

