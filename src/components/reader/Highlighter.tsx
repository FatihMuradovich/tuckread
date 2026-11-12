"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Highlight } from "@/app/read/actions";
import {
  anchorFromOffsets,
  locateAnchor,
  rangeToOffsets,
  textSegments,
  unwrap,
  wrapOffsets,
} from "@/lib/highlights/anchor";

type Props = {
  articleId: string;
  /** id of the element holding the article text. */
  targetId: string;
  initial: Highlight[];
  create: (
    articleId: string,
    anchor: { quote: string; prefix: string; suffix: string },
    note?: string,
  ) => Promise<Highlight | { error: string }>;
  updateNote: (id: string, note: string) => Promise<{ ok: true } | { error: string }>;
  remove: (id: string) => Promise<{ ok: true } | { error: string }>;
};

type Point = { x: number; y: number; below: boolean };

export function Highlighter({ articleId, targetId, initial, create, updateNote, remove }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [toolbar, setToolbar] = useState<Point | null>(null);
  const [active, setActive] = useState<{ id: string; at: Point } | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marks = useRef(new Map<string, HTMLElement[]>());
  const pendingRange = useRef<Range | null>(null);

  const target = useCallback(() => document.getElementById(targetId), [targetId]);

  const draw = useCallback(
    (h: Highlight) => {
      const root = target();
      if (!root || marks.current.has(h.id)) return;
      const where = locateAnchor(textSegments(root).text, h);
      if (!where) return; // the article text changed; keep the highlight in the list but don't draw it
      const els = wrapOffsets(root, where.start, where.end, () => {
        const m = document.createElement("mark");
        m.className = "tr-hl";
        m.dataset.hlId = h.id;
        m.dataset.hasNote = String(Boolean(h.note));
        return m;
      });
      marks.current.set(h.id, els);
    },
    [target],
  );

  // Draw saved highlights once the article is on screen; remove them if the component goes away.
  // Uses the first `initial` only: later highlights are drawn as they're created.
  const initialRef = useRef(initial);
  useEffect(() => {
    const drawn = marks.current;
    initialRef.current.forEach(draw);
    return () => {
      drawn.forEach((els) => unwrap(els));
      drawn.clear();
    };
  }, [draw]);

  // Errors shown as a toast fade after a few seconds.
  useEffect(() => {
    if (!error || active) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, active]);

  const placeAbove = (rect: DOMRect): Point => {
    const below = rect.top < 64;
    return { x: rect.left + rect.width / 2, y: below ? rect.bottom + 8 : rect.top - 8, below };
  };

  // Show the toolbar when the reader selects text inside the article.
  useEffect(() => {
    const onSelect = () => {
      const root = target();
      const sel = window.getSelection();
      if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer) || sel.toString().trim().length < 2) {
        setToolbar(null);
        return;
      }
      pendingRange.current = range.cloneRange();
      setActive(null);
      setToolbar(placeAbove(range.getBoundingClientRect()));
    };
    const hide = () => {
      setToolbar(null);
      setActive(null);
    };
    document.addEventListener("mouseup", onSelect);
    document.addEventListener("keyup", onSelect);
    document.addEventListener("touchend", onSelect);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("mouseup", onSelect);
      document.removeEventListener("keyup", onSelect);
      document.removeEventListener("touchend", onSelect);
      window.removeEventListener("scroll", hide);
    };
  }, [target]);

  // Clicking a highlight opens its note.
  useEffect(() => {
    const root = target();
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as Element).closest?.("mark.tr-hl") as HTMLElement | null;
      if (!mark || !window.getSelection()?.isCollapsed) return;
      const id = mark.dataset.hlId!;
      const h = highlights.find((x) => x.id === id);
      setDraft(h?.note ?? "");
      setError(null);
      setToolbar(null);
      setActive({ id, at: placeAbove(mark.getBoundingClientRect()) });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [target, highlights]);

  // Mark the open highlight so it stands out.
  useEffect(() => {
    marks.current.forEach((els, id) => els.forEach((el) => (el.dataset.active = String(id === active?.id))));
  }, [active]);

  async function saveSelection(withNote: boolean) {
    const root = target();
    const range = pendingRange.current;
    if (!root || !range) return;
    const offsets = rangeToOffsets(root, range);
    if (!offsets) return;

    const anchor = anchorFromOffsets(textSegments(root).text, offsets.start, offsets.end);
    setBusy(true);
    const result = await create(articleId, anchor);
    setBusy(false);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setHighlights((hs) => [...hs, result]);
    draw(result);
    if (withNote) {
      const first = marks.current.get(result.id)?.[0];
      setDraft("");
      if (first) setActive({ id: result.id, at: placeAbove(first.getBoundingClientRect()) });
    }
  }

  async function saveNote() {
    if (!active) return;
    setBusy(true);
    const result = await updateNote(active.id, draft);
    setBusy(false);
    if ("error" in result) return setError(result.error);
    const note = draft.trim() || null;
    setHighlights((hs) => hs.map((h) => (h.id === active.id ? { ...h, note } : h)));
    marks.current.get(active.id)?.forEach((el) => (el.dataset.hasNote = String(Boolean(note))));
    setActive(null);
  }

  async function removeActive() {
    if (!active) return;
    setBusy(true);
    const result = await remove(active.id);
    setBusy(false);
    if ("error" in result) return setError(result.error);
    unwrap(marks.current.get(active.id) ?? []);
    marks.current.delete(active.id);
    setHighlights((hs) => hs.filter((h) => h.id !== active.id));
    setActive(null);
  }

  const floatStyle = (p: Point) => ({
    left: Math.min(Math.max(p.x, 140), window.innerWidth - 140),
    top: p.y,
    transform: `translate(-50%, ${p.below ? "0" : "-100%"})`,
  });

  return (
    <>
      {toolbar && (
        <div
          className="fixed z-50 flex overflow-hidden rounded-full bg-ink text-sm font-semibold text-bg shadow-lg"
          style={floatStyle(toolbar)}
          onMouseDown={(e) => e.preventDefault()} // keep the selection while clicking
        >
          <button type="button" disabled={busy} onClick={() => saveSelection(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10">
            <span className="size-3 rounded-sm bg-accent" aria-hidden="true" />
            Highlight
          </button>
          <span className="w-px bg-white/20" aria-hidden="true" />
          <button type="button" disabled={busy} onClick={() => saveSelection(true)} className="px-4 py-2 hover:bg-white/10">
            Add note
          </button>
        </div>
      )}

      {active && (
        <div
          role="dialog"
          aria-label="Highlight note"
          className="fixed z-50 grid w-72 gap-2 rounded-2xl border border-line bg-surface p-3 shadow-xl"
          style={floatStyle(active.at)}
        >
          <label htmlFor="hl-note" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            Note
          </label>
          <textarea
            id="hl-note"
            autoFocus
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
              if (e.key === "Escape") setActive(null);
            }}
            placeholder="Why does this stand out?"
            className="resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <button type="button" disabled={busy} onClick={removeActive} className="text-sm text-muted hover:text-red-600">
              Remove highlight
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={saveNote}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {error && !active && (
        <p role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow-lg">
          {error}
        </p>
      )}
    </>
  );
}
