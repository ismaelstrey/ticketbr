import { z } from "zod";

// ============================================================
// Enums (espelham o schema Prisma)
// ============================================================
export const EquipmentTypeSchema = z.enum([
  "SWITCH",
  "ROUTER",
  "FIREWALL",
  "SERVER",
  "VM",
  "COMPUTER",
  "PRINTER",
  "ACCESS_POINT",
  "OTHER"
]);

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

export const CreateEquipmentSchema = z.object({
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
  solicitanteId: z.string().trim().min(1).nullable().optional()
});

// Na atualização todos os campos são opcionais
export const UpdateEquipmentSchema = CreateEquipmentSchema.partial();

export const EquipmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  type: EquipmentTypeSchema.optional(),
  status: EquipmentStatusSchema.optional(),
  solicitanteId: z.string().trim().min(1).optional()
});

// ============================================================
// Credenciais (cofre)
// ============================================================
export const CreateCredentialSchema = z.object({
  equipmentId: z.string().trim().min(1).nullable().optional(),
  label: z.string().trim().min(1, "Rótulo é obrigatório").max(120),
  protocol: CredentialProtocolSchema.optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  username: optionalText(180),
  secret: z.string().min(1, "Senha é obrigatória"),
  notes: optionalText(4000),
  accessPolicy: CredentialAccessPolicySchema.optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional()
});

export const UpdateCredentialSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  protocol: CredentialProtocolSchema.optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  username: optionalText(180),
  // Quando omitida, a senha atual é mantida
  secret: z.string().min(1).optional(),
  notes: optionalText(4000),
  accessPolicy: CredentialAccessPolicySchema.optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional()
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
export type CreateGrantInput = z.infer<typeof CreateGrantSchema>;
export type CreateUserGroupInput = z.infer<typeof CreateUserGroupSchema>;
export type UpdateUserGroupInput = z.infer<typeof UpdateUserGroupSchema>;
