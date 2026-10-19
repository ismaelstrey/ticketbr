-- Módulo de inventário de equipamentos e cofre de credenciais (senhas cifradas + ACL).

-- Tipos (enums)
CREATE TYPE "EquipmentType" AS ENUM ('SWITCH', 'ROUTER', 'FIREWALL', 'SERVER', 'VM', 'COMPUTER', 'PRINTER', 'ACCESS_POINT', 'OTHER');
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED');
CREATE TYPE "CredentialProtocol" AS ENUM ('SSH', 'TELNET', 'HTTP', 'HTTPS', 'RDP', 'SNMP', 'OTHER');
CREATE TYPE "CredentialAccessPolicy" AS ENUM ('OWNER_AND_ADMINS', 'STAFF', 'CUSTOM');
CREATE TYPE "CredentialAccessLevel" AS ENUM ('VIEW', 'REVEAL');
CREATE TYPE "AccessSubjectType" AS ENUM ('USER', 'GROUP', 'ROLE');

-- Grupos de usuários
CREATE TABLE "user_groups" (
  "id" text NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  "created_by" text,
  "updated_by" text,
  "deleted_at" timestamptz,
  CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");

CREATE TABLE "user_group_members" (
  "id" text NOT NULL,
  "group_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_group_members_group_id_user_id_key" ON "user_group_members"("group_id", "user_id");
CREATE INDEX "user_group_members_user_id_idx" ON "user_group_members"("user_id");

ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Equipamentos
CREATE TABLE "equipment" (
  "id" text NOT NULL,
  "code" varchar(60),
  "name" varchar(180) NOT NULL,
  "type" "EquipmentType" NOT NULL,
  "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "brand" varchar(120),
  "model" varchar(120),
  "serial_number" varchar(120),
  "hostname" varchar(180),
  "ip_address" varchar(64),
  "mac_address" varchar(64),
  "location" varchar(180),
  "func" varchar(180),
  "description" text,
  "solicitante_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  "created_by" text,
  "updated_by" text,
  "deleted_at" timestamptz,
  CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipment_code_key" ON "equipment"("code");
CREATE INDEX "equipment_type_status_idx" ON "equipment"("type", "status");
CREATE INDEX "equipment_ip_address_idx" ON "equipment"("ip_address");
CREATE INDEX "equipment_solicitante_id_idx" ON "equipment"("solicitante_id");

ALTER TABLE "equipment" ADD CONSTRAINT "equipment_solicitante_id_fkey"
  FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Credenciais (cofre)
CREATE TABLE "equipment_credentials" (
  "id" text NOT NULL,
  "equipment_id" text,
  "label" varchar(120) NOT NULL,
  "protocol" "CredentialProtocol" NOT NULL DEFAULT 'SSH',
  "port" integer,
  "username" varchar(180),
  "secret" jsonb NOT NULL,
  "notes" text,
  "access_policy" "CredentialAccessPolicy" NOT NULL DEFAULT 'OWNER_AND_ADMINS',
  "owner_user_id" text,
  "last_rotated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  "created_by" text,
  "updated_by" text,
  "deleted_at" timestamptz,
  CONSTRAINT "equipment_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "equipment_credentials_equipment_id_idx" ON "equipment_credentials"("equipment_id");
CREATE INDEX "equipment_credentials_owner_user_id_idx" ON "equipment_credentials"("owner_user_id");

ALTER TABLE "equipment_credentials" ADD CONSTRAINT "equipment_credentials_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_credentials" ADD CONSTRAINT "equipment_credentials_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Concessões de acesso por credencial
CREATE TABLE "credential_access_grants" (
  "id" text NOT NULL,
  "credential_id" text NOT NULL,
  "subject_type" "AccessSubjectType" NOT NULL,
  "subject_id" text,
  "role" "Role",
  "level" "CredentialAccessLevel" NOT NULL DEFAULT 'REVEAL',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" text,
  CONSTRAINT "credential_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "credential_access_grants_credential_id_idx" ON "credential_access_grants"("credential_id");
CREATE INDEX "credential_access_grants_subject_type_subject_id_idx" ON "credential_access_grants"("subject_type", "subject_id");

ALTER TABLE "credential_access_grants" ADD CONSTRAINT "credential_access_grants_credential_id_fkey"
  FOREIGN KEY ("credential_id") REFERENCES "equipment_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
