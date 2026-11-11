"use client";

import { useActionState } from "react";
import { saveArticle, type SaveState } from "./actions";

export function SaveForm() {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveArticle, {});

  return (
    <form action={action} className="grid gap-3">
      <label htmlFor="url" className="text-sm font-semibold">
        Save an article
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          placeholder="Paste a link, like https://example.com/article"
          autoComplete="off"
          required
          defaultValue={state.error ? state.url : ""}
          key={state.at ?? 0}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          <span className="size-2 bg-accent [clip-path:polygon(0_0,100%_0,100%_100%)]" aria-hidden="true" />
          {pending ? "Tucking…" : "Tuck it"}
        </button>
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {state.error && <p className="text-red-700 dark:text-red-300">{state.error}</p>}
        {state.savedTitle && (
          <p className="text-primary">
            Tucked away: <span className="font-semibold">{state.savedTitle}</span>
          </p>
        )}
        {state.notice && <p className="mt-1 text-muted">{state.notice}</p>}
      </div>
    </form>
  );
}
