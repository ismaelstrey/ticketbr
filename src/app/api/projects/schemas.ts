import { z } from "zod";

export const ProjectStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const ProjectListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: ProjectStatusSchema.optional(),
  ownerUserId: z.string().trim().min(1).optional(),
  startDateFrom: z.string().date().optional(),
  endDateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  orderBy: z.enum(["createdAt", "updatedAt", "name"]).default("updatedAt"),
  orderDir: z.enum(["asc", "desc"]).default("desc")
});

export const ProjectUpsertSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(50_000).nullable().optional(),
  status: ProjectStatusSchema.optional(),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional()
});

export const ProjectExportSchema = z.object({
  format: z.enum(["csv", "xlsx", "json"]),
  query: ProjectListQuerySchema.partial().optional()
});

