"use client";

import Link from "next/link";
import { useState } from "react";
import type { Tag } from "@/app/read/actions";

type Props = {
  articleId: string;
  initial: Tag[];
  /** All of the user's tags, offered as suggestions. */
  suggestions: string[];
  add: (articleId: string, name: string) => Promise<Tag | { error: string }>;
  remove: (articleId: string, tagId: string) => Promise<{ ok: true } | { error: string }>;
};

export function TagEditor({ articleId, initial, suggestions, add, remove }: Props) {
  const [tags, setTags] = useState(initial);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const name = value.trim();
    if (!name) return;
    setError(null);
    const result = await add(articleId, name);
    if ("error" in result) return setError(result.error);
    setTags((ts) => (ts.some((t) => t.id === result.id) ? ts : [...ts, result]));
    setValue("");
  }

  async function drop(tag: Tag) {
    setTags((ts) => ts.filter((t) => t.id !== tag.id));
    const result = await remove(articleId, tag.id);
    if ("error" in result) {
      setError(result.error);
      setTags((ts) => [...ts, tag]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {tags.map((t) => (
        <span key={t.id} className="inline-flex items-center rounded-full bg-primary/12 font-semibold text-primary">
          <Link href={`/library?tag=${encodeURIComponent(t.name)}`} className="py-1 pl-3 hover:underline">
            {t.name}
          </Link>
          <button
            type="button"
            onClick={() => drop(t)}
            aria-label={`Remove tag ${t.name}`}
            className="rounded-full px-2 py-1 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            list="tag-suggestions"
            value={value}
            maxLength={40}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => !value && setAdding(false)}
            onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            placeholder="Tag name, then Enter"
            aria-label="New tag"
            className="w-44 rounded-full border border-line bg-surface px-3 py-1 outline-none focus:border-primary"
          />
          <datalist id="tag-suggestions">
            {suggestions
              .filter((s) => !tags.some((t) => t.name === s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-line px-3 py-1 text-muted hover:border-primary hover:text-primary"
        >
          + Tag
        </button>
      )}
      {error && <span className="text-red-700 dark:text-red-300">{error}</span>}
    </div>
  );
}
