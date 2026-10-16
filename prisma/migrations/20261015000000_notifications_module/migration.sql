-- Módulo de notificações (in-app + email).
-- Cria o enum de tipos e a tabela de notificações por usuário.

CREATE TYPE "NotificationType" AS ENUM (
  'TICKET_STATUS_CHANGED',
  'TICKET_COMMENT',
  'TICKET_ASSIGNED',
  'SLA_WARNING',
  'SLA_BREACHED'
);

CREATE TABLE "notifications" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "ticket_id" text,
  "solicitante_id" text,
  "tipo" "NotificationType" NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "link" text,
  "metadata" jsonb,
  "dedupe_key" text,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_ticket_id_idx" ON "notifications"("ticket_id");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
