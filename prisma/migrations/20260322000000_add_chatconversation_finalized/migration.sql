ALTER TABLE "ChatConversation"
ADD COLUMN IF NOT EXISTS "finalized" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ChatConversation"
SET "finalized" = true
WHERE "finalized" = false;

CREATE INDEX IF NOT EXISTS "ChatConversation_contactId_channel_finalized_closedAt_idx"
ON "ChatConversation"("contactId", "channel", "finalized", "closedAt");

