CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "projects" (
  "id" text NOT NULL,
  "name" character varying(180) NOT NULL,
  "description" text,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "owner_user_id" text NOT NULL,
  "start_date" date,
  "end_date" date,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_members" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_export_audit" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "project_id" text,
  "format" text NOT NULL,
  "filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_export_audit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "projects_status_created_at_idx" ON "projects"("status", "created_at");
CREATE INDEX "projects_owner_user_id_created_at_idx" ON "projects"("owner_user_id", "created_at");
CREATE INDEX "project_members_project_id_created_at_idx" ON "project_members"("project_id", "created_at");
CREATE INDEX "project_members_user_id_created_at_idx" ON "project_members"("user_id", "created_at");
CREATE INDEX "project_export_audit_user_id_created_at_idx" ON "project_export_audit"("user_id", "created_at");
CREATE INDEX "project_export_audit_project_id_created_at_idx" ON "project_export_audit"("project_id", "created_at");

ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_export_audit" ADD CONSTRAINT "project_export_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_export_audit" ADD CONSTRAINT "project_export_audit_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

