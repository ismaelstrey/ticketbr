-- Senhas padrão por cliente, compartilhadas por referência entre equipamentos do mesmo cliente.

CREATE TABLE "client_shared_secrets" (
  "id" text NOT NULL,
  "solicitante_id" text NOT NULL,
  "label" varchar(120) NOT NULL,
  "secret" jsonb NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  "created_by" text,
  "updated_by" text,
  "deleted_at" timestamptz,
  CONSTRAINT "client_shared_secrets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_shared_secrets_solicitante_id_idx" ON "client_shared_secrets"("solicitante_id");

ALTER TABLE "client_shared_secrets" ADD CONSTRAINT "client_shared_secrets_solicitante_id_fkey"
  FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vínculo opcional da credencial com uma senha padrão do cliente
ALTER TABLE "equipment_credentials" ADD COLUMN "shared_secret_id" text;
ALTER TABLE "equipment_credentials" ALTER COLUMN "secret" DROP NOT NULL;

CREATE INDEX "equipment_credentials_shared_secret_id_idx" ON "equipment_credentials"("shared_secret_id");

ALTER TABLE "equipment_credentials" ADD CONSTRAINT "equipment_credentials_shared_secret_id_fkey"
  FOREIGN KEY ("shared_secret_id") REFERENCES "client_shared_secrets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
