"use client";

import type { FormEvent } from "react";
import { useApiMutation } from "@/lib/useApiForm";
import { button, card, errorText, input, label } from "./ui";

interface Props {
  clients: { id: string; name: string }[];
}

export function NewProjectForm({ clients }: Props) {
  const { mutate, error, pending } = useApiMutation();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    // Drop empty optional fields so Zod doesn't see ""
    const body = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ""));
    const ok = await mutate("/api/projects", "POST", body);
    if (ok) form.reset();
  }

  if (clients.length === 0) {
    return (
      <div className={`${card} text-sm text-slate-500`}>
        <h2 className="mb-1 font-semibold text-slate-900">New project</h2>
        Add a client first — every project belongs to one.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${card} space-y-3`}>
      <h2 className="font-semibold">New project</h2>
      <label className={label}>
        Title
        <input name="title" required minLength={2} className={input} />
      </label>
      <label className={label}>
        Client
        <select name="clientId" required className={input}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Due date <span className="font-normal text-slate-400">(optional)</span>
        <input name="dueDate" type="date" className={input} />
      </label>
      {error && <p className={errorText}>{error}</p>}
      <button disabled={pending} className={button}>
        {pending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
