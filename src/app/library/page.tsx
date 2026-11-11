import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import { SaveForm } from "./SaveForm";

export const metadata: Metadata = { title: "Library · Tuckread" };

type View = "unread" | "archived";

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
        <SaveForm />
        <Suspense fallback={<ListSkeleton />}>
          <ArticleList searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function ArticleList({ searchParams }: Pick<PageProps<"/library">, "searchParams">) {
  const { view: rawView } = await searchParams;
  const view: View = rawView === "archive" ? "archived" : "unread";
  const { supabase } = await requireUser();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, site_name, reading_minutes, word_count, saved_at")
    .eq("status", view)
    .order("saved_at", { ascending: false })
    .limit(200);
  if (error) console.error("library list failed", error);

  return (
    <section className="grid gap-4" aria-labelledby="library-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="library-heading" className="font-display text-2xl font-bold tracking-[-0.02em]">
          {view === "unread" ? "Your library" : "Archive"}
        </h1>
        <nav className="flex gap-2 text-sm" aria-label="Library views">
          <Tab href="/library" active={view === "unread"}>Unread</Tab>
          <Tab href="/library?view=archive" active={view === "archived"}>Archive</Tab>
        </nav>
      </div>

      {error ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
          We couldn&apos;t load your library. Refresh the page to try again.
        </p>
      ) : !articles?.length ? (
        <div className="grid gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-display text-lg font-bold">
            {view === "unread" ? "Nothing tucked away yet." : "Nothing archived yet."}
          </p>
          <p className="text-muted">
            {view === "unread"
              ? "Paste a link above to save your first article."
              : "Articles you finish and archive will appear here."}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {articles.map((a) => (
            <li key={a.id} className="border-t border-line first:border-t-0">
              <Link href={`/read/${a.id}`} className="grid gap-1.5 px-5 py-4 transition hover:bg-bg">
                <span className="font-read text-[1.05rem] leading-snug font-semibold">{a.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {view === "unread" && <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />}
                  <span>{a.site_name ?? hostname(a.url)}</span>
                  <span>{a.word_count > 0 ? `${a.reading_minutes} min` : "Link only"}</span>
                  <span>{savedAgo(a.saved_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1 ${active ? "bg-ink text-bg" : "border border-line text-muted hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="h-8 w-40 rounded-lg bg-line" />
      <div className="h-64 rounded-2xl border border-line bg-surface" />
    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function savedAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 30) return `Saved ${days} days ago`;
  return `Saved ${new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
}
