-- Logs de webhook persistidos: substitui o armazenamento em memória (perdido a cada deploy).
-- Cada linha representa uma chamada externa recebida em um endpoint público de webhook.

CREATE TABLE "webhook_request_logs" (
  "id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "method" varchar(10) NOT NULL,
  "path" varchar(255) NOT NULL,
  "route" varchar(80) NOT NULL,
  "source" varchar(40) NOT NULL,
  "status" integer NOT NULL,
  "ok" boolean NOT NULL,
  "ip" varchar(64),
  "user_agent" varchar(255),
  "payload" jsonb,
  "headers" jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT "webhook_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_request_logs_created_at_idx" ON "webhook_request_logs"("created_at");
CREATE INDEX "webhook_request_logs_route_created_at_idx" ON "webhook_request_logs"("route", "created_at");
CREATE INDEX "webhook_request_logs_source_created_at_idx" ON "webhook_request_logs"("source", "created_at");
CREATE INDEX "webhook_request_logs_status_created_at_idx" ON "webhook_request_logs"("status", "created_at");
