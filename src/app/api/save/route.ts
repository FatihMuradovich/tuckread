import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { parseUserUrl, SaveError } from "@/lib/articles/extract";
import { MAX_CAPTURED_HTML, saveArticleForUser } from "@/lib/articles/save";
import { createClient } from "@/lib/supabase/server";

/**
 * Save endpoint for the Tuckread browser extension.
 * The extension is authenticated by the user's Tuckread session cookie, so requests are only
 * accepted from our own pages or a browser extension; ordinary websites can't call it.
 *
 * Body: { url: string, title?: string, html?: string }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (origin !== request.nextUrl.origin && !origin.startsWith("chrome-extension://")) {
    return json({ error: "forbidden", message: "This request isn't allowed." }, 403);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_CAPTURED_HTML + 64 * 1024) {
    return json({ error: "too_large", message: "This page is too large to save." }, 413);
  }

  let body: { url?: unknown; html?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", message: "The extension sent something we couldn't read." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ error: "signed_out", message: "Sign in to Tuckread to save pages." }, 401);
  }

  let url: URL;
  try {
    url = parseUserUrl(typeof body.url === "string" ? body.url : "");
  } catch (e) {
    return json({ error: "bad_url", message: e instanceof SaveError ? e.message : "That page can't be saved." }, 400);
  }

  const html = typeof body.html === "string" && body.html.length <= MAX_CAPTURED_HTML ? body.html : null;
  const result = await saveArticleForUser(supabase, { url, html });

  if (result.status === "error") return json({ error: "save_failed", message: result.message }, 422);
  if (result.status !== "exists") revalidatePath("/library");

  return json({
    status: result.status,
    id: result.id,
    title: result.title,
    linkOnly: result.linkOnly,
    readUrl: new URL(`/read/${result.id}`, request.nextUrl.origin).toString(),
  });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}
