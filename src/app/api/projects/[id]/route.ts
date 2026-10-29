import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, parseJson, requireAdmin, requireSession } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validations";
import { dispatchWorkflowEvent } from "@/lib/workflows";

type Ctx = { params: Promise<{ id: string }> };

// Every lookup filters by BOTH id and organizationId, so another tenant's
// id simply returns 404 — we never reveal that the record exists.
async function findOwned(id: string, organizationId: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!project) throw new ApiError(404, "Project not found");
  return project;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { organizationId } = await requireSession();
    const { id } = await params;
    return NextResponse.json(await findOwned(id, organizationId));
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { organizationId } = await requireSession();
    const { id } = await params;
    const input = await parseJson(req, updateProjectSchema);

    const before = await findOwned(id, organizationId);

    const updated = await prisma.project.update({
      where: { id: before.id },
      data: input,
      include: { client: { select: { id: true, name: true } } },
    });

    if (input.status && input.status !== before.status) {
      await dispatchWorkflowEvent(organizationId, "PROJECT_STATUS_CHANGED", {
        projectId: updated.id,
        title: updated.title,
        from: before.status,
        to: updated.status,
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    requireAdmin(session);
    const { id } = await params;

    // deleteMany with a tenant filter is atomic and can't touch other orgs
    const { count } = await prisma.project.deleteMany({
      where: { id, organizationId: session.organizationId },
    });
    if (count === 0) throw new ApiError(404, "Project not found");

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
