"use client";

import { useState, type FormEvent } from "react";
import { useApiMutation } from "@/lib/useApiForm";
import { button, card, errorText, input, label } from "./ui";

export function NewWorkflowForm() {
  const { mutate, error, pending } = useApiMutation();
  const [action, setAction] = useState("LOG_ACTIVITY");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const url = String(fd.get("url") ?? "");
    const ok = await mutate("/api/workflows", "POST", {
      name: fd.get("name"),
      trigger: fd.get("trigger"),
      action: fd.get("action"),
      config: action === "SEND_WEBHOOK" && url ? { url } : {},
    });
    if (ok) {
      form.reset();
      setAction("LOG_ACTIVITY");
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${card} space-y-3`}>
      <h2 className="font-semibold">New automation</h2>
      <label className={label}>
        Name
        <input name="name" required className={input} placeholder="Notify Slack on new project" />
      </label>
      <label className={label}>
        When
        <select name="trigger" className={input}>
          <option value="PROJECT_CREATED">A project is created</option>
          <option value="PROJECT_STATUS_CHANGED">A project status changes</option>
        </select>
      </label>
      <label className={label}>
        Then
        <select name="action" className={input} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="LOG_ACTIVITY">Log activity</option>
          <option value="SEND_WEBHOOK">Send a webhook</option>
        </select>
      </label>
      {action === "SEND_WEBHOOK" && (
        <label className={label}>
          Webhook URL (https)
          <input name="url" type="url" required pattern="https://.*" className={input} />
        </label>
      )}
      {error && <p className={errorText}>{error}</p>}
      <button disabled={pending} className={button}>
        {pending ? "Saving…" : "Save automation"}
      </button>
    </form>
  );
}
