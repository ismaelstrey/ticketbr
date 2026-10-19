export type EquipmentType =
  | "SWITCH"
  | "ROUTER"
  | "FIREWALL"
  | "SERVER"
  | "VM"
  | "COMPUTER"
  | "PRINTER"
  | "ACCESS_POINT"
  | "OTHER";

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
  solicitanteId: string | null;
  solicitante?: EquipmentSolicitante | null;
  credentialCount?: number;
  createdAt: string;
  updatedAt: string;
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
  // Sempre mascarado nas listagens/detalhes; só vem em claro no endpoint de revelação
  secret: string;
  notes: string | null;
  accessPolicy: CredentialAccessPolicy;
  ownerUserId: string | null;
  ownerName?: string | null;
  lastRotatedAt: string | null;
  canReveal: boolean;
  accessVia: string | null;
  grants?: CredentialGrant[];
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
