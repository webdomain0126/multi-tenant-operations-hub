import "server-only";
import type { Prisma, WorkflowTrigger } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Runs every active workflow for this tenant that listens to `trigger`.
 * Failures are recorded as WorkflowRun rows and never break the request
 * that fired the event.
 */
export async function dispatchWorkflowEvent(
  organizationId: string,
  trigger: WorkflowTrigger,
  payload: Prisma.InputJsonObject,
): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { organizationId, trigger, isActive: true },
  });

  await Promise.allSettled(
    workflows.map(async (wf) => {
      try {
        if (wf.action === "SEND_WEBHOOK") {
          const url = (wf.config as { url?: string } | null)?.url;
          if (!url) throw new Error("Webhook URL missing in workflow config");
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: trigger, data: payload }),
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
        }
        // LOG_ACTIVITY: the run row itself is the activity log entry
        await prisma.workflowRun.create({
          data: { workflowId: wf.id, status: "SUCCESS", input: payload },
        });
      } catch (err) {
        await prisma.workflowRun.create({
          data: {
            workflowId: wf.id,
            status: "FAILED",
            input: payload,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }),
  );
}
