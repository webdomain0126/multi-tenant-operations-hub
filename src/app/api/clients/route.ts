import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, parseJson, requireSession } from "@/lib/api";
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
    const { organizationId } = await requireSession();
    const input = await parseJson(req, createClientSchema);
    const client = await prisma.client.create({ data: { ...input, organizationId } });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
