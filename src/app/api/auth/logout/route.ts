import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "user.logout",
      targetType: "User",
      targetId: session.userId,
    });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
