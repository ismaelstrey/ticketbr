export type EquipmentType =
  | "SWITCH"
  | "ROUTER"
  | "FIREWALL"
  | "SERVER"
  | "HYPERVISOR"
  | "VM"
  | "CONTAINER"
  | "COMPUTER"
  | "PRINTER"
  | "ACCESS_POINT"
  | "OTHER";

// Plataforma de virtualização do host
export type VirtualizationPlatform =
  | "PROXMOX_VE"
  | "VMWARE_ESXI"
  | "VMWARE_VCENTER"
  | "MICROSOFT_HYPERV"
  | "XCP_NG"
  | "KVM"
  | "OTHER";

// Controlador de gerenciamento fora de banda (iLO/iDRAC/IPMI)
export type ManagementController = "NONE" | "ILO" | "IDRAC" | "IPMI" | "ILO_AND_IDRAC" | "OTHER";

export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "RETIRED";

export type CredentialProtocol = "SSH" | "TELNET" | "HTTP" | "HTTPS" | "RDP" | "SNMP" | "OTHER";

export type CredentialAccessPolicy = "OWNER_AND_ADMINS" | "STAFF" | "CUSTOM";

export type CredentialAccessLevel = "VIEW" | "REVEAL";

export type AccessSubjectType = "USER" | "GROUP" | "ROLE";

export type EquipmentSolicitante = { id: string; nome_fantasia: string };

export type Equipment = {
  id: string;
  code: string | null;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  hostname: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  location: string | null;
  func: string | null;
  description: string | null;
  // Hierarquia de infraestrutura (host -> VM -> container)
  parentId: string | null;
  // Virtualização e gerenciamento fora de banda
  virtualizationPlatform: VirtualizationPlatform | null;
  managementController: ManagementController | null;
  managementIp: string | null;
  managementUrl: string | null;
  url: string | null;
  vmid: number | null;
  guestOs: string | null;
  cpuCores: number | null;
  memoryMb: number | null;
  diskGb: number | null;
  tags: string[];
  solicitanteId: string | null;
  solicitante?: EquipmentSolicitante | null;
  credentialCount?: number;
  childCount?: number;
  // Caminho legível na árvore: "ACME / proxmox-01 / vm-zabbix"
  path?: string;
  // Recursos diretamente vinculados (VMs de um host, containers de uma VM)
  children?: EquipmentChild[];
  createdAt: string;
  updatedAt: string;
};

export type EquipmentChild = {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  vmid: number | null;
  ipAddress: string | null;
  url: string | null;
  virtualizationPlatform: VirtualizationPlatform | null;
  childCount: number;
};

// Nó da árvore de infraestrutura usado na página /infraestrutura
export type InfraTreeNode = {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  hostname: string | null;
  ipAddress: string | null;
  url: string | null;
  managementIp: string | null;
  managementController: ManagementController | null;
  virtualizationPlatform: VirtualizationPlatform | null;
  vmid: number | null;
  tags: string[];
  credentialCount: number;
  children: InfraTreeNode[];
};

export type InfraTreeSummary = {
  hosts: number;
  vms: number;
  containers: number;
  managedHosts: number;
};

export type InfraTree = {
  solicitante: EquipmentSolicitante | null;
  summary: InfraTreeSummary;
  nodes: InfraTreeNode[];
};

// Resultado da busca rápida: mostra o caminho completo até o recurso
export type InfraSearchResult = {
  id: string;
  name: string;
  type: EquipmentType;
  path: string;
  solicitante: EquipmentSolicitante | null;
  ipAddress: string | null;
  url: string | null;
  matchedOn: string[];
};

export type CredentialGrant = {
  id: string;
  subjectType: AccessSubjectType;
  subjectId: string | null;
  subjectLabel: string;
  role: "ADMIN" | "AGENT" | null;
  level: CredentialAccessLevel;
};

export type Credential = {
  id: string;
  equipmentId: string | null;
  equipmentName?: string | null;
  label: string;
  protocol: CredentialProtocol;
  port: number | null;
  username: string | null;
  // Link de acesso informado manualmente
  url: string | null;
  // Link pronto para abrir no navegador (derivado quando não informado)
  loginUrl: string | null;
  // Sempre mascarado nas listagens/detalhes; só vem em claro no endpoint de revelação
  secret: string;
  notes: string | null;
  accessPolicy: CredentialAccessPolicy;
  ownerUserId: string | null;
  ownerName?: string | null;
  // Preenchido quando a credencial reaproveita a senha padrão do cliente
  sharedSecretId: string | null;
  sharedSecretLabel?: string | null;
  lastRotatedAt: string | null;
  canReveal: boolean;
  accessVia: string | null;
  grants?: CredentialGrant[];
  createdAt: string;
  updatedAt: string;
};

export type SharedSecret = {
  id: string;
  solicitanteId: string;
  label: string;
  // Sempre mascarado; a senha em claro só sai pelo endpoint de revelação da credencial
  secret: string;
  notes: string | null;
  credentialCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserGroupMember = { id: string; name: string; email: string };

export type UserGroup = {
  id: string;
  name: string;
  description: string | null;
  members: UserGroupMember[];
  createdAt?: string;
  updatedAt?: string;
};
