"use client";

import type { ProjectStatus } from "@prisma/client";
import { useApiMutation } from "@/lib/useApiForm";

const STYLES: Record<ProjectStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-800 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const { mutate, pending, error } = useApiMutation();

  return (
    <div className="flex flex-col items-end">
      <select
        aria-label="Project status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => mutate(`/api/projects/${projectId}`, "PATCH", { status: e.target.value })}
        className={`rounded-full border px-3 py-1 text-xs font-medium ${STYLES[status]} disabled:opacity-60`}
      >
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
      </select>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </div>
  );
}
