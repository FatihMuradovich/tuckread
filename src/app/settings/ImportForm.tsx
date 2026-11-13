"use client";

import Link from "next/link";
import { useState } from "react";
import { IMPORT_BATCH_SIZE, parseExport, type ParseResult } from "@/lib/import/parse";
import { importBatch } from "./actions";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

type Phase =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ready"; fileName: string; parsed: ParseResult }
  | { kind: "importing"; done: number; total: number }
  | { kind: "finished"; imported: number; alreadySaved: number; invalid: number; error?: string };

export function ImportForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      return setPhase({ kind: "error", message: "That file is larger than 20 MB. Split it, or export a smaller part." });
    }
    const parsed = parseExport(file.name, await file.text());
    if (parsed.items.length === 0) {
      return setPhase({
        kind: "error",
        message: `We couldn't find any links in that file (${parsed.source}). Use the CSV or HTML export from Pocket or Instapaper, or a browser bookmarks file.`,
      });
    }
    setPhase({ kind: "ready", fileName: file.name, parsed });
  }

  async function runImport(parsed: ParseResult) {
    const total = parsed.items.length;
    let imported = 0;
    let alreadySaved = 0;
    let invalid = parsed.skipped;
    setPhase({ kind: "importing", done: 0, total });

    for (let i = 0; i < total; i += IMPORT_BATCH_SIZE) {
      const result = await importBatch(parsed.items.slice(i, i + IMPORT_BATCH_SIZE)).catch(() => ({
        error: "Lost connection while importing. Try again; already imported articles will be skipped.",
      }));
      if ("error" in result) {
        return setPhase({ kind: "finished", imported, alreadySaved, invalid, error: result.error });
      }
      imported += result.imported;
      alreadySaved += result.alreadySaved;
      invalid += result.invalid;
      setPhase({ kind: "importing", done: Math.min(total, i + IMPORT_BATCH_SIZE), total });
    }
    setPhase({ kind: "finished", imported, alreadySaved, invalid });
  }

  return (
    <div className="grid gap-4">
      {(phase.kind === "idle" || phase.kind === "error") && (
        <label className="grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg px-6 py-8 text-center hover:border-primary">
          <span className="font-semibold">Choose an export file</span>
          <span className="text-sm text-muted">Pocket (.csv or .html), Instapaper (.csv) or browser bookmarks (.html)</span>
          <input
            type="file"
            id="import-file"
            accept=".csv,.html,.htm,text/csv,text/html"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      )}

      {phase.kind === "error" && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{phase.message}</p>}

      {phase.kind === "ready" && (
        <div className="grid gap-4 rounded-2xl border border-line bg-bg p-5">
          <div className="grid gap-1">
            <p className="font-semibold">{phase.fileName}</p>
            <p className="text-sm text-muted">Recognized as {phase.parsed.source}.</p>
          </div>
          <ul className="grid gap-1 text-sm">
            <li>
              <strong>{phase.parsed.items.length.toLocaleString("en")}</strong> {plural(phase.parsed.items.length, "article")}
              {" · "}
              {phase.parsed.items.filter((i) => i.status === "unread").length.toLocaleString("en")} unread
              {" · "}
              {phase.parsed.items.filter((i) => i.status === "archived").length.toLocaleString("en")} archived
            </li>
            <li>
              {new Set(phase.parsed.items.flatMap((i) => i.tags)).size.toLocaleString("en")}{" "}
              {plural(new Set(phase.parsed.items.flatMap((i) => i.tags)).size, "tag")}
            </li>
            {phase.parsed.skipped > 0 && (
              <li className="text-muted">
                {phase.parsed.skipped} {phase.parsed.skipped === 1 ? "entry" : "entries"} skipped (duplicates or not web links)
              </li>
            )}
          </ul>
          <p className="text-sm text-muted">
            Articles come in as links. Open one and choose &ldquo;Fetch the article text&rdquo;, or save it again with the browser button, to get the reading view.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runImport(phase.parsed)}
              className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90"
            >
              Import {phase.parsed.items.length.toLocaleString("en")} {plural(phase.parsed.items.length, "article")}
            </button>
            <button type="button" onClick={() => setPhase({ kind: "idle" })} className="rounded-full px-4 py-2.5 text-muted hover:text-ink">
              Choose another file
            </button>
          </div>
        </div>
      )}

      {phase.kind === "importing" && (
        <div className="grid gap-2" aria-live="polite">
          <p className="text-sm font-semibold">
            Importing… {phase.done.toLocaleString("en")} of {phase.total.toLocaleString("en")}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${(phase.done / phase.total) * 100}%` }} />
          </div>
          <p className="text-xs text-muted">Keep this page open until it finishes.</p>
        </div>
      )}

      {phase.kind === "finished" && (
        <div className="grid gap-3 rounded-2xl border border-line bg-bg p-5" aria-live="polite">
          <p className="font-semibold">
            {phase.error ? "Import stopped." : "Import finished."} {phase.imported.toLocaleString("en")}{" "}
            {plural(phase.imported, "article")} added.
          </p>
          <p className="text-sm text-muted">
            {phase.alreadySaved > 0 && `${phase.alreadySaved.toLocaleString("en")} were already in your library. `}
            {phase.invalid > 0 && `${phase.invalid.toLocaleString("en")} entries were skipped.`}
          </p>
          {phase.error && <p className="text-sm text-red-700 dark:text-red-300">{phase.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Link href="/library" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">
              Go to your library
            </Link>
            <button type="button" onClick={() => setPhase({ kind: "idle" })} className="rounded-full px-4 py-2.5 text-muted hover:text-ink">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
