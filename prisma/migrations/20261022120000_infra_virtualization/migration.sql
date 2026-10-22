-- Inventário de infraestrutura virtualizada: hosts (Proxmox/VMware), VMs e containers.
-- Adiciona hierarquia (host -> VM -> container), dados de virtualização/gerenciamento
-- fora de banda (iLO/iDRAC) e link de acesso direto na credencial.

-- 1) Novos tipos de equipamento (não são usados nesta migração, apenas adicionados)
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'HYPERVISOR';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'CONTAINER';

-- 2) Enums de virtualização e gerenciamento
CREATE TYPE "VirtualizationPlatform" AS ENUM ('PROXMOX_VE', 'VMWARE_ESXI', 'VMWARE_VCENTER', 'MICROSOFT_HYPERV', 'XCP_NG', 'KVM', 'OTHER');
CREATE TYPE "ManagementController" AS ENUM ('NONE', 'ILO', 'IDRAC', 'IPMI', 'ILO_AND_IDRAC', 'OTHER');

-- 3) Hierarquia e dados de virtualização no equipamento
ALTER TABLE "equipment" ADD COLUMN "parent_id" text;
ALTER TABLE "equipment" ADD COLUMN "virtualization_platform" "VirtualizationPlatform";
ALTER TABLE "equipment" ADD COLUMN "management_controller" "ManagementController";
ALTER TABLE "equipment" ADD COLUMN "management_ip" varchar(64);
ALTER TABLE "equipment" ADD COLUMN "management_url" text;
ALTER TABLE "equipment" ADD COLUMN "url" text;
ALTER TABLE "equipment" ADD COLUMN "vmid" integer;
ALTER TABLE "equipment" ADD COLUMN "guest_os" varchar(120);
ALTER TABLE "equipment" ADD COLUMN "cpu_cores" integer;
ALTER TABLE "equipment" ADD COLUMN "memory_mb" integer;
ALTER TABLE "equipment" ADD COLUMN "disk_gb" integer;
ALTER TABLE "equipment" ADD COLUMN "tags" text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX "equipment_parent_id_idx" ON "equipment"("parent_id");
CREATE INDEX "equipment_solicitante_id_type_idx" ON "equipment"("solicitante_id", "type");

ALTER TABLE "equipment" ADD CONSTRAINT "equipment_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Link de acesso direto (HTTP/HTTPS) na credencial
ALTER TABLE "equipment_credentials" ADD COLUMN "url" text;
