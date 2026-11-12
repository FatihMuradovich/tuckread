"use server";

import { requireUser } from "@/lib/auth";

// Server Actions used by the reading view. Every action re-checks the user; Row Level Security
// additionally guarantees a user can only touch their own articles, highlights and tags.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_THRESHOLD = 0.95;

function assertId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Invalid id");
}

// ---------- Reading progress ----------

export async function saveProgress(articleId: string, progress: number) {
  assertId(articleId);
  if (typeof progress !== "number" || !Number.isFinite(progress)) return;
  const value = Math.min(1, Math.max(0, progress));

  const { supabase } = await requireUser();
  const update: { progress: number; read_at?: string } = { progress: Math.round(value * 1000) / 1000 };

  if (value >= READ_THRESHOLD) {
    // Mark as read the first time the reader reaches the end.
    const { data } = await supabase.from("articles").select("read_at").eq("id", articleId).maybeSingle();
    if (data && !data.read_at) update.read_at = new Date().toISOString();
  }
  await supabase.from("articles").update(update).eq("id", articleId);
}

// ---------- Highlights ----------

export type Highlight = { id: string; quote: string; prefix: string; suffix: string; note: string | null };

export async function createHighlight(
  articleId: string,
  anchor: { quote: string; prefix: string; suffix: string },
  note?: string,
): Promise<Highlight | { error: string }> {
  assertId(articleId);
  const quote = String(anchor?.quote ?? "").slice(0, 5000);
  if (quote.trim().length < 2) return { error: "Select a few words to highlight." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("highlights")
    .insert({
      article_id: articleId,
      quote,
      prefix: String(anchor.prefix ?? "").slice(-64),
      suffix: String(anchor.suffix ?? "").slice(0, 64),
      note: cleanNote(note),
    })
    .select("id, quote, prefix, suffix, note")
    .single();

  if (error) {
    console.error("createHighlight failed", error);
    return { error: "Couldn't save the highlight. Try again." };
  }
  return data;
}

export async function updateHighlightNote(highlightId: string, note: string) {
  assertId(highlightId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("highlights").update({ note: cleanNote(note) }).eq("id", highlightId);
  return error ? { error: "Couldn't save the note. Try again." } : { ok: true as const };
}

export async function deleteHighlight(highlightId: string) {
  assertId(highlightId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("highlights").delete().eq("id", highlightId);
  return error ? { error: "Couldn't remove the highlight. Try again." } : { ok: true as const };
}

function cleanNote(note: unknown): string | null {
  const text = typeof note === "string" ? note.trim().slice(0, 2000) : "";
  return text || null;
}

// ---------- Tags ----------

export type Tag = { id: string; name: string };

/** Normalizes a tag: trimmed, lowercase, single spaces, max 40 characters. */
function cleanTagName(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, 40);
}

export async function addTag(articleId: string, rawName: string): Promise<Tag | { error: string }> {
  assertId(articleId);
  const name = cleanTagName(rawName);
  if (!name) return { error: "Type a tag name." };

  const { supabase } = await requireUser();

  // Reuse the user's existing tag with the same name, or create it.
  const { data: existing } = await supabase.from("tags").select("id, name");
  let tag = existing?.find((t) => t.name.toLowerCase() === name) ?? null;
  if (!tag) {
    const { data, error } = await supabase.from("tags").insert({ name }).select("id, name").single();
    if (error) {
      console.error("addTag create failed", error);
      return { error: "Couldn't create the tag. Try again." };
    }
    tag = data;
  }

  const { error } = await supabase.from("article_tags").insert({ article_id: articleId, tag_id: tag.id });
  if (error && error.code !== "23505") {
    console.error("addTag link failed", error);
    return { error: "Couldn't add the tag. Try again." };
  }
  return tag;
}

export async function removeTag(articleId: string, tagId: string) {
  assertId(articleId);
  assertId(tagId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("article_tags").delete().eq("article_id", articleId).eq("tag_id", tagId);
  return error ? { error: "Couldn't remove the tag. Try again." } : { ok: true as const };
}
