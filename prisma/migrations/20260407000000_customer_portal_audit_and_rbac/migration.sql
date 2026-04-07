ALTER TABLE "Funcionario" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" text PRIMARY KEY,
  "solicitante_id" text,
  "actor_user_id" text,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "audit_logs_solicitante_created_at_idx" ON "audit_logs" ("solicitante_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_at_idx" ON "audit_logs" ("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entity_id_idx" ON "audit_logs" ("entity", "entity_id");

