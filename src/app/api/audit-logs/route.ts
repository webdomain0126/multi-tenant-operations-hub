import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, requireAdmin, requireSession } from "@/lib/api";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /api/audit-logs?limit=50 -> latest audit entries for this tenant (admins only)
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    requireAdmin(session);

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new ApiError(400, "Invalid query parameters");

    const logs = await prisma.auditLog.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(logs);
  } catch (err) {
    return handleError(err);
  }
}
