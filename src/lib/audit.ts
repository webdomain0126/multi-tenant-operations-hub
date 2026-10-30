import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const AUDIT_ACTIONS = [
  "org.created",
  "user.login",
  "user.login_failed",
  "user.logout",
  "client.created",
  "project.created",
  "project.updated",
  "project.deleted",
  "workflow.created",
  "projects.exported",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = "Organization" | "User" | "Client" | "Project" | "Workflow";

export interface RecordAuditInput {
  organizationId: string;
  actorId: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  metadata?: Prisma.InputJsonObject;
}

async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    // On Vercel the first entry of x-forwarded-for is the real client IP
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

/**
 * Records an audit entry. It never throws: a failure to write the log
 * is reported to the server console but does not break the user's action.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
        ipAddress: await getClientIp(),
      },
    });
  } catch (err) {
    console.error(`[audit] failed to record "${input.action}"`, err);
  }
}

/** Human-readable sentence fragments for the activity log UI */
export const AUDIT_LABELS: Record<AuditAction, string> = {
  "org.created": "created the organization",
  "user.login": "signed in",
  "user.login_failed": "had a failed sign-in attempt",
  "user.logout": "signed out",
  "client.created": "added client",
  "project.created": "created project",
  "project.updated": "updated project",
  "project.deleted": "deleted project",
  "workflow.created": "created automation",
  "projects.exported": "exported projects to CSV",
};
