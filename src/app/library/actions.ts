"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { extractArticle, parseUserUrl, SaveError, titleFromUrl } from "@/lib/articles/extract";

export type SaveState = { error?: string; savedTitle?: string; notice?: string; url?: string; at?: number };

export async function saveArticle(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const raw = String(formData.get("url") ?? "");
  if (!raw.trim()) return { error: "Paste a link to save.", at: Date.now() };

  const { supabase } = await requireUser();

  let url: URL;
  try {
    url = parseUserUrl(raw);
  } catch (e) {
    return { error: e instanceof SaveError ? e.message : "That doesn't look like a link.", url: raw, at: Date.now() };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("articles")
    .select("title")
    .eq("url", url.toString())
    .maybeSingle();
  if (lookupError) {
    console.error("saveArticle lookup failed", lookupError);
    return { error: "Saving failed. Try again in a moment.", url: raw, at: Date.now() };
  }
  if (existing) return { error: `Already in your library: “${existing.title}”.`, at: Date.now() };

  let row;
  let notice: string | undefined;
  try {
    const article = await extractArticle(url);
    row = {
      url: url.toString(),
      title: article.title,
      site_name: article.siteName,
      byline: article.byline,
      excerpt: article.excerpt,
      content_html: article.contentHtml,
      word_count: article.wordCount,
      reading_minutes: article.readingMinutes,
    };
  } catch (e) {
    if (!(e instanceof SaveError)) {
      console.error("saveArticle extract failed", e);
      return { error: "We couldn't read that page. Try again in a moment.", url: raw, at: Date.now() };
    }
    if (!e.linkOnly) return { error: e.message, url: raw, at: Date.now() };

    // We can't read the text, but the link is still worth keeping.
    row = {
      url: url.toString(),
      title: titleFromUrl(url),
      site_name: url.hostname.replace(/^www\./, ""),
      content_html: null,
      word_count: 0,
    };
    notice = `${e.message} We saved the link; open it on the original site to read.`;
  }

  const { error } = await supabase.from("articles").insert(row);
  if (error) {
    if (error.code === "23505") return { error: "That link is already in your library.", at: Date.now() };
    console.error("saveArticle insert failed", error);
    return { error: "Saving failed. Try again in a moment.", url: raw, at: Date.now() };
  }

  revalidatePath("/library");
  return { savedTitle: row.title, notice, at: Date.now() };
}

export async function setArchived(id: string, archived: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("articles").update({ status: archived ? "archived" : "unread" }).eq("id", id);
  revalidatePath("/library");
  redirect("/library");
}

export async function deleteArticle(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("articles").delete().eq("id", id);
  revalidatePath("/library");
  redirect("/library");
}
