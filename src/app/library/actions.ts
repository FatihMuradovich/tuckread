"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseUserUrl, SaveError } from "@/lib/articles/extract";
import { saveArticleForUser } from "@/lib/articles/save";

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

  const result = await saveArticleForUser(supabase, { url });
  switch (result.status) {
    case "error":
      return { error: result.message, url: raw, at: Date.now() };
    case "exists":
      return { error: `Already in your library: “${result.title}”.`, at: Date.now() };
    default:
      revalidatePath("/library");
      return { savedTitle: result.title, notice: result.notice, at: Date.now() };
  }
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
