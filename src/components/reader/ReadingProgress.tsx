"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  articleId: string;
  /** Saved progress from 0 (top) to 1 (end). */
  initialProgress: number;
  /** id of the element holding the article text. */
  targetId: string;
  save: (articleId: string, progress: number) => Promise<void>;
};

const SAVE_DELAY_MS = 1500;
const MIN_CHANGE = 0.02;

/** Thin bar at the top of the screen, resume-where-you-left-off, and progress saving. */
export function ReadingProgress({ articleId, initialProgress, targetId, save }: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [resumed, setResumed] = useState(false);
  const lastSaved = useRef(initialProgress);
  const current = useRef(initialProgress);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // 0 at the top of the page, 1 once the end of the article reaches the bottom of the screen.
    const distance = () => {
      const rect = target.getBoundingClientRect();
      return Math.max(1, rect.bottom + window.scrollY - window.innerHeight);
    };
    const measure = () => Math.min(1, Math.max(0, window.scrollY / distance()));

    const flush = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (Math.abs(current.current - lastSaved.current) < MIN_CHANGE && current.current < 0.95) return;
      lastSaved.current = current.current;
      save(articleId, current.current).catch(() => {});
    };

    const onScroll = () => {
      const p = measure();
      current.current = p;
      setProgress(p);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    };

    // Resume: jump to where the reader stopped last time (skip if they had barely started or finished).
    // (Not cancelled on cleanup: React may re-run this effect right away in development, after the
    // jump already happened, and the note should still appear.)
    if (initialProgress > 0.03 && initialProgress < 0.97 && window.scrollY < 50) {
      window.scrollTo({ top: initialProgress * distance() });
      requestAnimationFrame(() => setResumed(true));
    }

    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [articleId, initialProgress, targetId, save]);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-40 h-[3px] bg-transparent"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {resumed && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap shadow-lg">
          <span>Picked up where you left off</span>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setResumed(false);
            }}
            className="rounded-full bg-bg px-3 py-1 font-semibold hover:text-primary"
          >
            Start over
          </button>
          <button type="button" onClick={() => setResumed(false)} aria-label="Dismiss" className="px-2 text-muted hover:text-ink">
            ×
          </button>
        </div>
      )}
    </>
  );
}
