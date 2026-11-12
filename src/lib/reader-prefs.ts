/** Reader preferences, kept in this browser's localStorage and applied as attributes on <html>. */

export type ReaderPrefs = {
  theme: "auto" | "light" | "sepia" | "dark";
  size: "s" | "m" | "l" | "xl";
  width: "narrow" | "regular" | "wide";
};

export const DEFAULT_PREFS: ReaderPrefs = { theme: "auto", size: "m", width: "regular" };
export const PREFS_KEY = "tr-reader";

/**
 * Runs inline in <head> before the first paint, so a saved theme or text size never flashes.
 * Kept tiny and dependency-free on purpose; it mirrors applyPrefs() below.
 */
export const PREFS_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}"),r=document.documentElement;if(p.theme&&p.theme!=="auto")r.setAttribute("data-theme",p.theme);if(p.size&&p.size!=="m")r.setAttribute("data-reader-size",p.size);if(p.width&&p.width!=="regular")r.setAttribute("data-reader-width",p.width)}catch(e){}})()`;

export function readPrefs(): ReaderPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function applyPrefs(prefs: ReaderPrefs) {
  const root = document.documentElement;
  const set = (name: string, value: string, defaultValue: string) =>
    value === defaultValue ? root.removeAttribute(name) : root.setAttribute(name, value);
  set("data-theme", prefs.theme, "auto");
  set("data-reader-size", prefs.size, "m");
  set("data-reader-width", prefs.width, "regular");
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or storage blocked: settings still apply for this visit.
  }
}
