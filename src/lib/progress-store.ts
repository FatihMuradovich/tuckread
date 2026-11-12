/**
 * Latest reading progress per article, kept in this browser tab (sessionStorage).
 *
 * The database is the source of truth, but its save can land after the library page has already been
 * fetched (Next.js renders the next page before unmounting the reader), and the back button can show a
 * cached library. The reader writes here on every scroll, and the library reads it, so the percentage
 * is right the moment you get back.
 */

const key = (id: string) => `tr-progress:${id}`;

export function setLocalProgress(articleId: string, progress: number) {
  try {
    sessionStorage.setItem(key(articleId), String(Math.round(progress * 1000) / 1000));
  } catch {
    // Storage blocked: the library falls back to the saved value.
  }
}

/** Raw stored string (stable for useSyncExternalStore), or null. */
export function getLocalProgressRaw(articleId: string): string | null {
  try {
    return sessionStorage.getItem(key(articleId));
  } catch {
    return null;
  }
}
