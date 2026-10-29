"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Small helper: POST/PATCH JSON, surface the first validation error, refresh server data. */
export function useApiMutation() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function mutate(url: string, method: "POST" | "PATCH", body: unknown): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: Record<string, string[]>;
        };
        const first = data.details ? Object.values(data.details).flat()[0] : undefined;
        setError(first ?? data.error ?? "Request failed");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setPending(false);
    }
  }

  return { mutate, error, pending };
}
