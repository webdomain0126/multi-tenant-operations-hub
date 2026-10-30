import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, parseJson } from "@/lib/api";
import { createSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validations";

// Hash computed once so failed lookups take the same time as real ones
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", 12);

export async function POST(req: Request) {
  try {
    const { email, password } = await parseJson(req, loginSchema);

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    // A wrong password for a real account is worth recording for that tenant
    if (user && !valid) {
      await recordAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "user.login_failed",
        targetType: "User",
        targetId: user.id,
      });
    }

    // Same message for unknown email and wrong password
    if (!user || !valid) throw new ApiError(401, "Invalid email or password");

    await createSession({ userId: user.id, organizationId: user.organizationId, role: user.role });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "user.login",
      targetType: "User",
      targetId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
