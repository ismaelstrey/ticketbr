-- KPIs persistidos: snapshot diário para relatórios e tendências gerenciais.
-- Cada linha representa a consolidação dos indicadores de um dia (idempotente por data).

CREATE TABLE "kpi_snapshots" (
  "id" text NOT NULL,
  "snapshot_date" date NOT NULL,
  "open_total" integer NOT NULL DEFAULT 0,
  "done_total" integer NOT NULL DEFAULT 0,
  "overdue_total" integer NOT NULL DEFAULT 0,
  "sla_warning_total" integer NOT NULL DEFAULT 0,
  "avg_resolution_hours" double precision,
  "first_contact_resolution_rate" double precision,
  "details" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_snapshots_snapshot_date_key" ON "kpi_snapshots"("snapshot_date");
