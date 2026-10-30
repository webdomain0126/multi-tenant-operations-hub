import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, parseJson, requireAdmin, requireSession } from "@/lib/api";
import { createWorkflowSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const { organizationId } = await requireSession();
    const workflows = await prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        runs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    return NextResponse.json(workflows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireAdmin(session);
    const input = await parseJson(req, createWorkflowSchema);
    const workflow = await prisma.workflow.create({
      data: { ...input, organizationId: session.organizationId },
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "workflow.created",
      targetType: "Workflow",
      targetId: workflow.id,
      metadata: { name: workflow.name, trigger: workflow.trigger, action: workflow.action },
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
