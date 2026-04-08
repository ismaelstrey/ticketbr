export type ProjectStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProjectOwner = { id: string; name: string; email: string };

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerUserId: string;
  ownerUser?: ProjectOwner;
  startDate: string | null;
  endDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
};

export type ProjectListQuery = {
  q?: string;
  status?: ProjectStatus | "";
  ownerUserId?: string;
  startDateFrom?: string;
  endDateTo?: string;
  page?: string;
  pageSize?: string;
  orderBy?: "createdAt" | "updatedAt" | "name";
  orderDir?: "asc" | "desc";
};

