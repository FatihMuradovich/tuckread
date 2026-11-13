import { NextResponse, type NextRequest } from "next/server";
import {
  EXPORT_FORMATS,
  toJson,
  toMarkdown,
  toPocketCsv,
  type ExportArticle,
  type ExportFormat,
} from "@/lib/export/format";
import { createClient } from "@/lib/supabase/server";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request

/** GET /api/export?format=json|markdown|csv — downloads the signed-in user's whole library. */
export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ?? "json") as ExportFormat;
  if (!(format in EXPORT_FORMATS)) {
    return NextResponse.json({ error: "Unknown format. Use json, markdown or csv." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const articles: ExportArticle[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "url, title, site_name, byline, excerpt, status, is_favorite, progress, saved_at, read_at, word_count, tags(name), highlights(quote, note, created_at)",
      )
      .order("saved_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("export failed", error);
      return NextResponse.json({ error: "Export failed. Try again." }, { status: 500 });
    }
    for (const row of data ?? []) {
      articles.push({
        ...row,
        tags: (row.tags ?? []).map((t: { name: string }) => t.name),
        highlights: (row.highlights ?? []).sort((a: { created_at: string }, b: { created_at: string }) =>
          a.created_at.localeCompare(b.created_at),
        ),
      } as ExportArticle);
    }
    if (!data || data.length < PAGE) break;
  }

  const body = format === "markdown" ? toMarkdown(articles) : format === "csv" ? toPocketCsv(articles) : toJson(articles);
  const { ext, type } = EXPORT_FORMATS[format];
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": type,
      "content-disposition": `attachment; filename="tuckread-${date}.${ext}"`,
      "cache-control": "no-store",
    },
  });
}
