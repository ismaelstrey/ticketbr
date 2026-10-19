import type {
  CredentialAccessPolicy,
  CredentialProtocol,
  EquipmentStatus,
  EquipmentType
} from "@/types/inventory";

// Rótulos legíveis dos tipos de equipamento
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  SWITCH: "Switch",
  ROUTER: "Roteador",
  FIREWALL: "Firewall",
  SERVER: "Servidor",
  VM: "Máquina virtual",
  COMPUTER: "Computador",
  PRINTER: "Impressora",
  ACCESS_POINT: "Access point",
  OTHER: "Outro"
};

// Rótulos legíveis dos status de equipamento
export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Manutenção",
  INACTIVE: "Inativo",
  RETIRED: "Baixado"
};

// Tons visuais por status (usados no Badge)
export const EQUIPMENT_STATUS_TONE: Record<EquipmentStatus, "neutral" | "success" | "warning" | "info"> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  INACTIVE: "neutral",
  RETIRED: "neutral"
};

// Rótulos dos protocolos suportados pelo cofre
export const PROTOCOL_LABELS: Record<CredentialProtocol, string> = {
  SSH: "SSH",
  TELNET: "Telnet",
  HTTP: "HTTP",
  HTTPS: "HTTPS",
  RDP: "RDP",
  SNMP: "SNMP",
  OTHER: "Outro"
};

// Rótulos das políticas de acesso da credencial
export const ACCESS_POLICY_LABELS: Record<CredentialAccessPolicy, string> = {
  OWNER_AND_ADMINS: "Somente responsável e administradores",
  STAFF: "Todos os usuários de staff",
  CUSTOM: "Lista personalizada (usuários, grupos ou papéis)"
};

// Listas para os selects do formulário
export const EQUIPMENT_TYPE_OPTIONS = Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[];
export const EQUIPMENT_STATUS_OPTIONS = Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[];
export const PROTOCOL_OPTIONS = Object.keys(PROTOCOL_LABELS) as CredentialProtocol[];
export const ACCESS_POLICY_OPTIONS = Object.keys(ACCESS_POLICY_LABELS) as CredentialAccessPolicy[];
