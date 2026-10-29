import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, parseJson } from "@/lib/api";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validations";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

// Creates a new organization and its first ADMIN user in one transaction
export async function POST(req: Request) {
  try {
    const input = await parseJson(req, registerSchema);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const slug = `${slugify(input.organizationName) || "org"}-${crypto.randomUUID().slice(0, 6)}`;

    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName, slug },
      });
      return tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: "ADMIN",
          organizationId: org.id,
        },
      });
    });

    await createSession({ userId: user.id, organizationId: user.organizationId, role: user.role });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
