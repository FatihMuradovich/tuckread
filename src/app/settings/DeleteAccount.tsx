"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

const PHRASE = "delete my account";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="justify-self-start rounded-full border border-line px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-500 dark:text-red-300"
      >
        Delete account…
      </button>
    );
  }

  return (
    <form
      className="grid gap-3 rounded-2xl border border-red-500/40 bg-red-500/5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await deleteAccount(text);
          if (result && "error" in result) setError(result.error);
        });
      }}
    >
      <p className="text-sm">
        This permanently deletes your account and every article, tag, highlight and note in it. It can&apos;t be undone.
        Export your library first if you want to keep a copy.
      </p>
      <label htmlFor="delete-confirm" className="text-sm font-semibold">
        Type <span className="font-mono">{PHRASE}</span> to confirm
      </label>
      <input
        id="delete-confirm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoComplete="off"
        className="rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-red-500"
      />
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || text.trim().toLowerCase() !== PHRASE}
          className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
