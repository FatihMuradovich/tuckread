import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractArticle,
  parseArticleHtml,
  parseUserUrl,
  SaveError,
  titleFromUrl,
  type ExtractedArticle,
} from "./extract";

export const MAX_CAPTURED_HTML = 5 * 1024 * 1024;

export type SaveResult =
  | { status: "saved" | "updated" | "exists"; id: string; title: string; linkOnly: boolean; notice?: string }
  | { status: "error"; message: string };

type Row = {
  url: string;
  title: string;
  site_name: string | null;
  byline?: string | null;
  excerpt?: string | null;
  content_html: string | null;
  word_count: number;
  reading_minutes?: number;
};

/**
 * Saves an article for the signed-in user behind `supabase` (RLS scopes every query to them).
 * With `html` (captured by the browser extension) the page is parsed as the reader saw it;
 * without it, the server fetches the page and falls back to a link-only bookmark if the site blocks us.
 */
export async function saveArticleForUser(
  supabase: SupabaseClient,
  input: { url: URL; html?: string | null },
): Promise<SaveResult> {
  const url = input.url.toString();

  // Same page already saved? Compare against links cleaned with today's rules, since older saves
  // may still carry tracking parameters we now strip. Candidates share the origin and path.
  const base = `${input.url.origin}${input.url.pathname}`.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: candidates, error: lookupError } = await supabase
    .from("articles")
    .select("id, title, word_count, url")
    .like("url", `${base}%`)
    .limit(50);
  if (lookupError) {
    console.error("save lookup failed", lookupError);
    return { status: "error", message: "Saving failed. Try again in a moment." };
  }
  const existing =
    (candidates ?? []).find((c) => {
      try {
        return parseUserUrl(c.url).toString() === url;
      } catch {
        return c.url === url;
      }
    }) ?? null;

  // Already saved with its text: nothing to do. Saved as link-only: only worth redoing if we now have HTML.
  if (existing && (existing.word_count > 0 || !input.html)) {
    return { status: "exists", id: existing.id, title: existing.title, linkOnly: existing.word_count === 0 };
  }

  let row: Row;
  let notice: string | undefined;
  try {
    const article = input.html ? parseArticleHtml(input.html, input.url) : await extractArticle(input.url);
    row = toRow(url, article);
  } catch (e) {
    if (!(e instanceof SaveError)) {
      console.error("save extract failed", e);
      return { status: "error", message: "We couldn't read that page. Try again in a moment." };
    }
    if (!e.linkOnly) return { status: "error", message: e.message };
    row = { url, title: titleFromUrl(input.url), site_name: input.url.hostname.replace(/^www\./, ""), content_html: null, word_count: 0 };
    notice = `${e.message} We saved the link; open it on the original site to read.`;
  }

  const linkOnly = row.word_count === 0;

  if (existing) {
    const { error } = await supabase.from("articles").update(row).eq("id", existing.id);
    if (error) {
      console.error("save update failed", error);
      return { status: "error", message: "Saving failed. Try again in a moment." };
    }
    return { status: "updated", id: existing.id, title: row.title, linkOnly };
  }

  const { data: inserted, error } = await supabase.from("articles").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { status: "error", message: "That link is already in your library." };
    console.error("save insert failed", error);
    return { status: "error", message: "Saving failed. Try again in a moment." };
  }
  return { status: "saved", id: inserted.id, title: row.title, linkOnly, notice };
}

function toRow(url: string, a: ExtractedArticle): Row {
  return {
    url,
    title: a.title,
    site_name: a.siteName,
    byline: a.byline,
    excerpt: a.excerpt,
    content_html: a.contentHtml,
    word_count: a.wordCount,
    reading_minutes: a.readingMinutes,
  };
}
