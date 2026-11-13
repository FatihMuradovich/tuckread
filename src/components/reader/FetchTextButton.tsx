"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** "Fetch the article text" for link-only articles; reloads the page with the reading view on success. */
export function FetchTextButton({
  articleId,
  fetchText,
}: {
  articleId: string;
  fetchText: (id: string) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid justify-items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await fetchText(articleId);
            if ("error" in result) setError(result.error);
            else router.refresh();
          })
        }
        className="rounded-full border border-line bg-bg px-5 py-2.5 font-semibold hover:border-primary disabled:opacity-60"
      >
        {pending ? "Fetching the text…" : "Fetch the article text"}
      </button>
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
