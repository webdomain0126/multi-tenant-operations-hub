import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { NewProjectForm } from "@/components/NewProjectForm";
import { NewClientForm } from "@/components/NewClientForm";
import { StatusSelect } from "@/components/StatusSelect";
import { NewWorkflowForm } from "@/components/NewWorkflowForm";
import { LocalTime } from "@/components/LocalTime";
import { AUDIT_LABELS, type AuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Completed" } as const;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { organizationId } = session;

  // Every query below is scoped by organizationId from the signed session
  const [user, org, clients, projects, statusCounts, workflows] = await Promise.all([
    prisma.user.findFirst({ where: { id: session.userId, organizationId }, select: { name: true, role: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    prisma.client.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      where: { organizationId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.project.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
    prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { runs: true } } },
    }),
  ]);

  if (!user || !org) redirect("/login");

  const count = (s: keyof typeof STATUS_LABEL) => statusCounts.find((c) => c.status === s)?._count ?? 0;
  const stats = [
    { label: "Clients", value: clients.length },
    { label: "Pending", value: count("PENDING") },
    { label: "In progress", value: count("IN_PROGRESS") },
    { label: "Completed", value: count("COMPLETED") },
  ];
  const isAdmin = user.role === "ADMIN";

  // Activity log is admin-only, matching the /api/audit-logs permission
  const auditLogs = isAdmin
    ? await prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { actor: { select: { name: true } } },
      })
    : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Ops Hub</p>
            <h1 className="text-lg font-semibold">{org.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user.name} · <span className="font-medium">{user.role.toLowerCase()}</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <NewClientForm />
            <NewProjectForm clients={clients} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Projects</h2>
              {projects.length > 0 && (
                <a
                  href="/api/projects/export"
                  download
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  Export CSV
                </a>
              )}
            </div>
            {projects.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No projects yet. Add a client, then create your first project.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-sm text-slate-500">
                        {p.client.name}
                        {p.dueDate && ` · due ${p.dueDate.toLocaleDateString()}`}
                      </p>
                    </div>
                    <StatusSelect projectId={p.id} status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {isAdmin && <NewWorkflowForm />}
          <div className={`rounded-xl border border-slate-200 bg-white ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Automations</h2>
            </div>
            {workflows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No automations configured.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {workflows.map((w) => {
                  const last = w.runs[0];
                  return (
                    <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="font-medium">{w.name}</p>
                        <p className="text-sm text-slate-500">
                          When {w.trigger.replaceAll("_", " ").toLowerCase()} → {w.action.replaceAll("_", " ").toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="tabular-nums text-slate-600">{w._count.runs} runs</p>
                        {last && (
                          <p className={last.status === "SUCCESS" ? "text-emerald-600" : "text-red-600"}>
                            Last: {last.status.toLowerCase()}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Activity log</h2>
              <p className="text-sm text-slate-500">Who did what in your organization, newest first</p>
            </div>
            {auditLogs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {auditLogs.map((log) => {
                  const meta = (log.metadata ?? {}) as Record<string, unknown>;
                  const subject =
                    typeof meta.title === "string" ? meta.title : typeof meta.name === "string" ? meta.name : null;
                  const label = AUDIT_LABELS[log.action as AuditAction] ?? log.action;
                  const statusChange =
                    typeof meta.from === "string" && typeof meta.to === "string"
                      ? ` (${meta.from.replace("_", " ").toLowerCase()} → ${meta.to.replace("_", " ").toLowerCase()})`
                      : "";
                  return (
                    <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                      <p className="min-w-0">
                        <span className="font-medium">{log.actor?.name ?? "Deleted user"}</span>{" "}
                        <span className="text-slate-600">{label}</span>
                        {subject && <span className="font-medium"> “{subject}”</span>}
                        <span className="text-slate-500">{statusChange}</span>
                      </p>
                      <p className="shrink-0 text-xs text-slate-500">
                        <LocalTime iso={log.createdAt.toISOString()} />
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
