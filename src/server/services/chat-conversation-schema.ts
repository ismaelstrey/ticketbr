import { prisma } from "@/lib/prisma";

let ensured = false;

export async function ensureChatConversationFinalizedColumn() {
  if (ensured) return;
  const exec = (prisma as any).$executeRawUnsafe;
  if (typeof exec !== "function") {
    ensured = true;
    return;
  }

  await exec(`ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "finalized" BOOLEAN NOT NULL DEFAULT false;`);
  await exec(`ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "nextStartedAt" TIMESTAMP(3);`);
  await exec(
    `CREATE INDEX IF NOT EXISTS "ChatConversation_contactId_channel_finalized_closedAt_idx" ON "ChatConversation"("contactId","channel","finalized","closedAt");`
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "ChatConversation_contactId_channel_nextStartedAt_idx" ON "ChatConversation"("contactId","channel","nextStartedAt");`
  );
  ensured = true;
}
