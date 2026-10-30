"use client";

import { useEffect, useState } from "react";

/** Shows a timestamp in the viewer's own time zone (the server runs in UTC). */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
  }, [iso]);

  return <time dateTime={iso}>{text ?? "…"}</time>;
}
