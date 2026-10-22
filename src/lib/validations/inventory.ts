import { z } from "zod";

// ============================================================
// Enums (espelham o schema Prisma)
// ============================================================
export const EquipmentTypeSchema = z.enum([
  "SWITCH",
  "ROUTER",
  "FIREWALL",
  "SERVER",
  "HYPERVISOR",
  "VM",
  "CONTAINER",
  "COMPUTER",
  "PRINTER",
  "ACCESS_POINT",
  "OTHER"
]);

export const VirtualizationPlatformSchema = z.enum([
  "PROXMOX_VE",
  "VMWARE_ESXI",
  "VMWARE_VCENTER",
  "MICROSOFT_HYPERV",
  "XCP_NG",
  "KVM",
  "OTHER"
]);

export const ManagementControllerSchema = z.enum(["NONE", "ILO", "IDRAC", "IPMI", "ILO_AND_IDRAC", "OTHER"]);

export const EquipmentStatusSchema = z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE", "RETIRED"]);

export const CredentialProtocolSchema = z.enum(["SSH", "TELNET", "HTTP", "HTTPS", "RDP", "SNMP", "OTHER"]);

export const CredentialAccessPolicySchema = z.enum(["OWNER_AND_ADMINS", "STAFF", "CUSTOM"]);

export const CredentialAccessLevelSchema = z.enum(["VIEW", "REVEAL"]);

export const AccessSubjectTypeSchema = z.enum(["USER", "GROUP", "ROLE"]);

export const StaffRoleSchema = z.enum(["ADMIN", "AGENT"]);

// ============================================================
// Equipamentos
// ============================================================
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max).nullable().optional();

const EquipmentBaseSchema = z.object({
  code: optionalText(60),
  name: z.string().trim().min(2, "Nome é obrigatório").max(180),
  type: EquipmentTypeSchema,
  status: EquipmentStatusSchema.optional(),
  brand: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  hostname: optionalText(180),
  ipAddress: optionalText(64),
  macAddress: optionalText(64),
  location: optionalText(180),
  func: optionalText(180),
  description: optionalText(4000),
  // Hierarquia de infraestrutura (host -> VM -> container)
  parentId: z.string().trim().min(1).nullable().optional(),
  // Virtualização e gerenciamento fora de banda (opcionais)
  virtualizationPlatform: VirtualizationPlatformSchema.nullable().optional(),
  managementController: ManagementControllerSchema.nullable().optional(),
  managementIp: optionalText(64),
  managementUrl: optionalText(500),
  url: optionalText(500),
  vmid: optionalInt(0, 999999),
  guestOs: optionalText(120),
  cpuCores: optionalInt(0, 4096),
  memoryMb: optionalInt(0, 4194304),
  diskGb: optionalInt(0, 1048576),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  solicitanteId: z.string().trim().min(1).nullable().optional()
});

// Todo host de virtualização precisa informar a plataforma
const requiresPlatformWhenHypervisor = (value: { type?: string; virtualizationPlatform?: string | null }) =>
  value.type !== "HYPERVISOR" || Boolean(value.virtualizationPlatform);

export const CreateEquipmentSchema = EquipmentBaseSchema.refine(requiresPlatformWhenHypervisor, {
  message: "Informe a plataforma de virtualização do host",
  path: ["virtualizationPlatform"]
});

// Na atualização todos os campos são opcionais
export const UpdateEquipmentSchema = EquipmentBaseSchema.partial().refine(
  // Só bloqueia quando o cliente limpa a plataforma de um host explicitamente
  (value) => !(value.type === "HYPERVISOR" && value.virtualizationPlatform === null),
  { message: "Informe a plataforma de virtualização do host", path: ["virtualizationPlatform"] }
);

export const EquipmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  type: EquipmentTypeSchema.optional(),
  status: EquipmentStatusSchema.optional(),
  solicitanteId: z.string().trim().min(1).optional()
});

// Árvore de infraestrutura de um cliente (opcional: sem cliente, retorna todos)
export const InventoryTreeQuerySchema = z.object({
  solicitanteId: z.string().trim().min(1).optional()
});

// Busca rápida no inventário de infraestrutura
export const InventorySearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Informe ao menos 2 caracteres"),
  solicitanteId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15)
});

// ============================================================
// Credenciais (cofre)
// ============================================================
export const CreateCredentialSchema = z
  .object({
    equipmentId: z.string().trim().min(1).nullable().optional(),
    label: z.string().trim().min(1, "Rótulo é obrigatório").max(120),
    protocol: CredentialProtocolSchema.optional(),
    port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
    username: optionalText(180),
    // Link de acesso direto (ex.: https://10.0.0.5:8006)
    url: optionalText(500),
    // Obrigatória apenas quando a credencial não reaproveita uma senha padrão do cliente
    secret: z.string().min(1, "Senha é obrigatória").optional(),
    notes: optionalText(4000),
    accessPolicy: CredentialAccessPolicySchema.optional(),
    ownerUserId: z.string().trim().min(1).nullable().optional(),
    sharedSecretId: z.string().trim().min(1).nullable().optional()
  })
  .refine((value) => Boolean(value.secret) || Boolean(value.sharedSecretId), {
    message: "Informe a senha ou selecione uma senha padrão do cliente",
    path: ["secret"]
  });

export const UpdateCredentialSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  protocol: CredentialProtocolSchema.optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  username: optionalText(180),
  // Link de acesso direto (ex.: https://10.0.0.5:8006)
  url: optionalText(500),
  // Quando omitida, a senha atual é mantida
  secret: z.string().min(1).optional(),
  notes: optionalText(4000),
  accessPolicy: CredentialAccessPolicySchema.optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  // Nulo remove o vínculo e mantém a senha própria da credencial
  sharedSecretId: z.string().trim().min(1).nullable().optional()
});

// ============================================================
// Senhas padrão por cliente (compartilhadas entre equipamentos)
// ============================================================
export const CreateSharedSecretSchema = z.object({
  solicitanteId: z.string().trim().min(1, "Cliente é obrigatório"),
  label: z.string().trim().min(1, "Rótulo é obrigatório").max(120),
  secret: z.string().min(1, "Senha é obrigatória"),
  notes: optionalText(2000)
});

export const UpdateSharedSecretSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  // Ao alterar, todos os equipamentos vinculados passam a usar a nova senha
  secret: z.string().min(1).optional(),
  notes: optionalText(2000)
});

// ============================================================
// Concessões de acesso (ACL)
// ============================================================
export const CreateGrantSchema = z
  .object({
    subjectType: AccessSubjectTypeSchema,
    subjectId: z.string().trim().min(1).nullable().optional(),
    role: StaffRoleSchema.nullable().optional(),
    level: CredentialAccessLevelSchema.optional()
  })
  .refine((value) => (value.subjectType === "ROLE" ? Boolean(value.role) : Boolean(value.subjectId)), {
    message: "Informe o usuário/grupo (subjectId) ou o papel (role) da concessão",
    path: ["subjectId"]
  });

// ============================================================
// Grupos de usuários
// ============================================================
export const CreateUserGroupSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  description: optionalText(2000),
  memberIds: z.array(z.string().trim().min(1)).optional()
});

export const UpdateUserGroupSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: optionalText(2000),
  memberIds: z.array(z.string().trim().min(1)).optional()
});

export type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof UpdateEquipmentSchema>;
export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof UpdateCredentialSchema>;
export type CreateSharedSecretInput = z.infer<typeof CreateSharedSecretSchema>;
export type UpdateSharedSecretInput = z.infer<typeof UpdateSharedSecretSchema>;
export type CreateGrantInput = z.infer<typeof CreateGrantSchema>;
export type CreateUserGroupInput = z.infer<typeof CreateUserGroupSchema>;
export type UpdateUserGroupInput = z.infer<typeof UpdateUserGroupSchema>;
