"use client";

import type { FormEvent } from "react";
import { useApiMutation } from "@/lib/useApiForm";
import { button, card, errorText, input, label } from "./ui";

export function NewClientForm() {
  const { mutate, error, pending } = useApiMutation();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const ok = await mutate("/api/clients", "POST", Object.fromEntries(new FormData(form)));
    if (ok) form.reset();
  }

  return (
    <form onSubmit={onSubmit} className={`${card} space-y-3`}>
      <h2 className="font-semibold">New client</h2>
      <label className={label}>
        Name
        <input name="name" required className={input} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required className={input} />
      </label>
      {error && <p className={errorText}>{error}</p>}
      <button disabled={pending} className={button}>
        {pending ? "Adding…" : "Add client"}
      </button>
    </form>
  );
}
