"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseUserUrl, titleFromUrl } from "@/lib/articles/extract";
import { IMPORT_BATCH_SIZE, type ImportItem } from "@/lib/import/parse";

export type ImportBatchResult = { imported: number; alreadySaved: number; invalid: number } | { error: string };

/**
 * Saves one batch of parsed import items as link-only articles (the text is fetched later, on demand).
 * Articles already in the library are left untouched. Input comes from the browser, so every field is
 * re-validated here.
 */
export async function importBatch(items: ImportItem[]): Promise<ImportBatchResult> {
  if (!Array.isArray(items) || items.length > IMPORT_BATCH_SIZE) return { error: "Invalid import batch." };
  const { supabase } = await requireUser();

  let invalid = 0;
  const rows = new Map<string, { row: Record<string, unknown>; tags: string[] }>();
  for (const item of items) {
    let url: URL;
    try {
      url = parseUserUrl(String(item?.url ?? ""));
    } catch {
      invalid++;
      continue;
    }
    const key = url.toString();
    if (rows.has(key)) continue;
    const saved = typeof item.savedAt === "string" ? new Date(item.savedAt) : null;
    rows.set(key, {
      row: {
        url: key,
        title: (String(item.title ?? "").trim() || titleFromUrl(url)).slice(0, 300),
        site_name: url.hostname.replace(/^www\./, ""),
        content_html: null,
        word_count: 0,
        status: item.status === "archived" ? "archived" : "unread",
        is_favorite: item.favorite === true,
        ...(saved && Number.isFinite(saved.getTime()) && saved.getTime() < Date.now() + 86_400_000
          ? { saved_at: saved.toISOString() }
          : {}),
      },
      tags: Array.isArray(item.tags)
        ? item.tags.map((t) => String(t).trim().replace(/\s+/g, " ").toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 20)
        : [],
    });
  }
  if (rows.size === 0) return { imported: 0, alreadySaved: 0, invalid };

  // Links already in the library, cleaned with today's rules: older saves may still carry tracking
  // parameters we now strip, and should count as the same article.
  const known = await libraryUrls(supabase);
  let alreadySaved = 0;
  for (const key of [...rows.keys()]) {
    if (known.has(key)) {
      rows.delete(key);
      alreadySaved++;
    }
  }
  if (rows.size === 0) return { imported: 0, alreadySaved, invalid };

  // Insert; rows whose URL is already in the library are skipped (ON CONFLICT DO NOTHING).
  const { data: inserted, error } = await supabase
    .from("articles")
    .upsert([...rows.values()].map((r) => r.row), { onConflict: "user_id,url", ignoreDuplicates: true })
    .select("id, url");
  if (error) {
    console.error("importBatch insert failed", error);
    return { error: "Importing failed partway. Try again; already imported articles will be skipped." };
  }

  // Tags for the newly inserted articles.
  const wanted = new Set<string>();
  for (const a of inserted ?? []) rows.get(a.url)?.tags.forEach((t) => wanted.add(t));
  if (wanted.size > 0) {
    const { data: existing } = await supabase.from("tags").select("id, name");
    const byName = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t.id as string]));
    const missing = [...wanted].filter((n) => !byName.has(n));
    if (missing.length) {
      const { data: created, error: tagError } = await supabase
        .from("tags")
        .insert(missing.map((name) => ({ name })))
        .select("id, name");
      if (tagError) console.error("importBatch tags failed", tagError);
      (created ?? []).forEach((t) => byName.set(t.name.toLowerCase(), t.id));
    }
    const links = (inserted ?? []).flatMap((a) =>
      (rows.get(a.url)?.tags ?? []).flatMap((t) => (byName.has(t) ? [{ article_id: a.id, tag_id: byName.get(t)! }] : [])),
    );
    if (links.length) {
      const { error: linkError } = await supabase
        .from("article_tags")
        .upsert(links, { onConflict: "article_id,tag_id", ignoreDuplicates: true });
      if (linkError) console.error("importBatch tag links failed", linkError);
    }
  }

  const imported = inserted?.length ?? 0;
  return { imported, alreadySaved: alreadySaved + rows.size - imported, invalid };
}

/** Every URL in the user's library, normalized with the current rules. */
async function libraryUrls(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const urls = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("articles").select("url").range(from, from + 999);
    for (const { url } of data ?? []) {
      try {
        urls.add(parseUserUrl(url).toString());
      } catch {
        urls.add(url);
      }
    }
    if (!data || data.length < 1000) break;
  }
  return urls;
}

/** Permanently deletes the account and, through ON DELETE CASCADE, every article, tag and highlight. */
export async function deleteAccount(confirmation: string): Promise<{ error: string } | void> {
  if (confirmation.trim().toLowerCase() !== "delete my account") {
    return { error: 'Type "delete my account" to confirm.' };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("deleteAccount failed", error);
    return { error: "Couldn't delete the account. Try again, or contact us." };
  }
  await supabase.auth.signOut();
  redirect("/");
}
