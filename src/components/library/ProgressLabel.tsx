"use client";

import { useSyncExternalStore } from "react";
import { getLocalProgressRaw } from "@/lib/progress-store";

const READ_AT = 0.95;
const noSubscribe = () => () => {};

/**
 * "45% read" / "Read" for a library row. Uses the progress this tab just recorded in the reader when
 * there is one (it can be newer than what the server sent), otherwise the saved value.
 */
export function ProgressLabel({ articleId, saved, read }: { articleId: string; saved: number; read: boolean }) {
  // Server render and hydration use `null` (the saved value); the browser then reads sessionStorage.
  const local = useSyncExternalStore(noSubscribe, () => getLocalProgressRaw(articleId), () => null);
  const progress = local != null ? Number(local) : saved;

  if (read || progress >= READ_AT) return <span className="font-semibold text-primary">Read</span>;
  if (progress >= 0.03) return <span className="font-semibold text-primary">{Math.round(progress * 100)}% read</span>;
  return null;
}
