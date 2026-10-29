import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, parseJson, requireSession } from "@/lib/api";
import { createProjectSchema, listProjectsQuerySchema } from "@/lib/validations";
import { dispatchWorkflowEvent } from "@/lib/workflows";

// GET /api/projects?status=PENDING&page=1&pageSize=20
export async function GET(req: Request) {
  try {
    const { organizationId } = await requireSession();

    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listProjectsQuerySchema.safeParse(params);
    if (!parsed.success) throw new ApiError(400, "Invalid query parameters");
    const { status, page, pageSize } = parsed.data;

    const where = { organizationId, ...(status && { status }) };

    const [items, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/projects
export async function POST(req: Request) {
  try {
    const { organizationId } = await requireSession();
    const input = await parseJson(req, createProjectSchema);

    // Critical isolation check: the client must belong to THIS tenant.
    // Without it, a user could attach a project to another org's client id.
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId },
      select: { id: true },
    });
    if (!client) throw new ApiError(404, "Client not found");

    const project = await prisma.project.create({
      data: { ...input, organizationId },
      include: { client: { select: { id: true, name: true } } },
    });

    await dispatchWorkflowEvent(organizationId, "PROJECT_CREATED", {
      projectId: project.id,
      title: project.title,
      status: project.status,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
