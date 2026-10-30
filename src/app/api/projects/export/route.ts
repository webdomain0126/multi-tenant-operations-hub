import { prisma } from "@/lib/prisma";
import { handleError, requireSession } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const BATCH_SIZE = 500;
const HEADER = ["id", "title", "status", "client", "client_email", "due_date", "created_at", "updated_at"];

/** Escapes one CSV cell and neutralises spreadsheet formula injection. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // A cell starting with = + - @ could run as a formula in Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Yields the CSV line by line, reading the database in batches, so memory
 *  use stays flat no matter how many projects a tenant has. */
async function* csvLines(organizationId: string): AsyncGenerator<string> {
  // The BOM makes Excel open the file as UTF-8 (keeps non-English names intact)
  yield "﻿" + HEADER.join(",") + "\r\n";

  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.project.findMany({
      where: { organizationId },
      include: { client: { select: { name: true, email: true } } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    for (const p of batch) {
      yield [p.id, p.title, p.status, p.client.name, p.client.email, p.dueDate, p.createdAt, p.updatedAt]
        .map(csvCell)
        .join(",") + "\r\n";
    }

    if (batch.length < BATCH_SIZE) return;
    cursor = batch[batch.length - 1]!.id;
  }
}

// GET /api/projects/export -> downloads the tenant's projects as CSV
export async function GET() {
  try {
    const session = await requireSession();
    const { organizationId } = session;

    const rowCount = await prisma.project.count({ where: { organizationId } });
    await recordAudit({
      organizationId,
      actorId: session.userId,
      action: "projects.exported",
      targetType: "Project",
      metadata: { rowCount },
    });

    const encoder = new TextEncoder();
    const lines = csvLines(organizationId);

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await lines.next();
          if (done) controller.close();
          else controller.enqueue(encoder.encode(value));
        } catch (err) {
          console.error("[export] stream failed", err);
          controller.error(err);
        }
      },
      async cancel() {
        await lines.return(undefined);
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ops-hub-projects-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
