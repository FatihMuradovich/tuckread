import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Highlighter } from "@/components/reader/Highlighter";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { ReadingProgress } from "@/components/reader/ReadingProgress";
import { TagEditor } from "@/components/reader/TagEditor";
import { requireUser } from "@/lib/auth";
import { sanitizeArticleHtml } from "@/lib/articles/sanitize";
import { deleteArticle, setArchived } from "@/app/library/actions";
import { FetchTextButton } from "@/components/reader/FetchTextButton";
import {
  addTag,
  createHighlight,
  fetchArticleText,
  deleteHighlight,
  removeTag,
  saveProgress,
  updateHighlightNote,
  type Highlight,
  type Tag,
} from "@/app/read/actions";

export const metadata: Metadata = { title: "Reading · Tuckread" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BODY_ID = "article-body";

export default function ReadPage({ params }: PageProps<"/read/[id]">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Suspense fallback={<ReaderSkeleton />}>
          <Reader params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function Reader({ params }: Pick<PageProps<"/read/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase } = await requireUser();
  const [{ data: article }, { data: highlights }, { data: allTags }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, url, title, site_name, byline, reading_minutes, content_html, status, progress, tags(id, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("highlights")
      .select("id, quote, prefix, suffix, note")
      .eq("article_id", id)
      .order("created_at"),
    supabase.from("tags").select("name").order("name"),
  ]);

  if (!article) notFound();

  const archived = article.status === "archived";
  // Stored HTML was sanitized when saved; sanitize again in case a row was written another way.
  const html = article.content_html ? sanitizeArticleHtml(article.content_html) : null;
  const tags = (article.tags ?? []) as Tag[];

  return (
    <article className="grid gap-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/library" className="text-sm text-muted hover:text-ink">
          ← Library
        </Link>
        {html && <ReaderSettings />}
      </div>

      <header className="grid gap-3">
        <h1 className="font-read text-3xl leading-tight font-semibold sm:text-4xl">{article.title}</h1>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          {article.byline && <span>{article.byline}</span>}
          {article.site_name && <span>{article.site_name}</span>}
          {html && <span>{article.reading_minutes} min read</span>}
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            Open original
          </a>
        </p>
        <TagEditor
          articleId={article.id}
          initial={tags}
          suggestions={(allTags ?? []).map((t) => t.name)}
          add={addTag}
          remove={removeTag}
        />
      </header>

      {html ? (
        <>
          <div id={BODY_ID} className="reader" dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />
          <Highlighter
            articleId={article.id}
            targetId={BODY_ID}
            initial={(highlights ?? []) as Highlight[]}
            create={createHighlight}
            updateNote={updateHighlightNote}
            remove={deleteHighlight}
          />
          <ReadingProgress articleId={article.id} initialProgress={article.progress ?? 0} targetId={BODY_ID} save={saveProgress} />
        </>
      ) : (
        <div className="grid justify-items-start gap-4 rounded-2xl border border-line bg-surface p-6">
          <p className="text-muted">
            Tuckread has the link to this article but not its text yet. It may have been imported, or the site may
            block reading apps. Try fetching it, or open the page and click the Tuckread browser button.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90"
            >
              Read on {article.site_name ?? "the original site"}
            </a>
            <FetchTextButton articleId={article.id} fetchText={fetchArticleText} />
          </div>
        </div>
      )}

      <footer className="flex flex-wrap gap-3 border-t border-line pt-6">
        <form action={setArchived.bind(null, article.id, !archived)}>
          <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">
            {archived ? "Move back to library" : "Done reading · Archive"}
          </button>
        </form>
        <form action={deleteArticle.bind(null, article.id)}>
          <button className="rounded-full border border-line px-5 py-2.5 font-semibold text-muted hover:border-red-500 hover:text-red-600">
            Delete
          </button>
        </form>
      </footer>
    </article>
  );
}

function ReaderSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="h-10 w-3/4 rounded-lg bg-line" />
      <div className="h-4 w-1/3 rounded bg-line" />
      <div className="mt-6 h-96 rounded-2xl bg-surface" />
    </div>
  );
}
