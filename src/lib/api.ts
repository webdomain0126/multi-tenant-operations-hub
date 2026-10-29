import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Every protected route starts here. The tenant id ALWAYS comes from the
 *  signed session — never from the request body, query string or headers. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  return session;
}

export function requireAdmin(session: SessionPayload): void {
  if (session.role !== "ADMIN") throw new ApiError(403, "Admin role required");
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(422, "Validation failed", z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
    if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
