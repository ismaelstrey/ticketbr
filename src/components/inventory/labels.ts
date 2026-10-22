import type {
  CredentialAccessPolicy,
  CredentialProtocol,
  EquipmentStatus,
  EquipmentType,
  ManagementController,
  VirtualizationPlatform
} from "@/types/inventory";

// Rótulos legíveis dos tipos de equipamento
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  SWITCH: "Switch",
  ROUTER: "Roteador",
  FIREWALL: "Firewall",
  SERVER: "Servidor",
  HYPERVISOR: "Host de virtualização",
  VM: "Máquina virtual",
  CONTAINER: "Container",
  COMPUTER: "Computador",
  PRINTER: "Impressora",
  ACCESS_POINT: "Access point",
  OTHER: "Outro"
};

// Rótulos das plataformas de virtualização
export const VIRTUALIZATION_PLATFORM_LABELS: Record<VirtualizationPlatform, string> = {
  PROXMOX_VE: "Proxmox VE",
  VMWARE_ESXI: "VMware ESXi",
  VMWARE_VCENTER: "VMware vCenter",
  MICROSOFT_HYPERV: "Microsoft Hyper-V",
  XCP_NG: "XCP-ng",
  KVM: "KVM",
  OTHER: "Outra"
};

// Rótulos dos controladores de gerenciamento fora de banda
export const MANAGEMENT_CONTROLLER_LABELS: Record<ManagementController, string> = {
  NONE: "Nenhum",
  ILO: "iLO",
  IDRAC: "iDRAC",
  IPMI: "IPMI",
  ILO_AND_IDRAC: "iLO e iDRAC",
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
export const VIRTUALIZATION_PLATFORM_OPTIONS = Object.keys(
  VIRTUALIZATION_PLATFORM_LABELS
) as VirtualizationPlatform[];
export const MANAGEMENT_CONTROLLER_OPTIONS = Object.keys(
  MANAGEMENT_CONTROLLER_LABELS
) as ManagementController[];

// Tipos que podem ser host de outros recursos (aceitam recursos vinculados)
export const PARENT_CAPABLE_TYPES: EquipmentType[] = ["SERVER", "HYPERVISOR", "VM"];
