import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, parseJson, requireSession } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { createClientSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { organizationId } = await requireSession();
    const clients = await prisma.client.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    return NextResponse.json(clients);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { organizationId } = session;
    const input = await parseJson(req, createClientSchema);
    const client = await prisma.client.create({ data: { ...input, organizationId } });

    await recordAudit({
      organizationId,
      actorId: session.userId,
      action: "client.created",
      targetType: "Client",
      targetId: client.id,
      metadata: { name: client.name },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
