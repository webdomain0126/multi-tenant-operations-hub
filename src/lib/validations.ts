import { z } from "zod";

export const projectStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);

export const createProjectSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(120),
  description: z.string().trim().max(2000).optional(),
  clientId: z.uuid("Invalid client id"),
  status: projectStatusSchema.default("PENDING"),
  dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).nullable(),
    status: projectStatusSchema,
    dueDate: z.coerce.date().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export const listProjectsQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((e) => e.toLowerCase()),
});

export const loginSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(2).max(80),
  trigger: z.enum(["PROJECT_CREATED", "PROJECT_STATUS_CHANGED"]),
  action: z.enum(["LOG_ACTIVITY", "SEND_WEBHOOK"]),
  config: z
    .object({ url: z.url({ protocol: /^https$/ }).optional() })
    .default({}),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
