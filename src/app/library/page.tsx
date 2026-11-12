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

type Item = {
  id: string;
  title: string;
  url: string;
  site_name: string | null;
  reading_minutes: number;
  word_count: number;
  saved_at: string;
  progress: number;
  read_at: string | null;
  tags: { id: string; name: string }[];
};

async function ArticleList({ searchParams }: Pick<PageProps<"/library">, "searchParams">) {
  const params = await searchParams;
  const view: View = params.view === "archive" ? "archived" : "unread";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase().slice(0, 40) : "";
  const { supabase } = await requireUser();

  // A second, filtered embed of tags narrows the list to one tag while `tags` still lists them all.
  let query = supabase
    .from("articles")
    .select(
      "id, title, url, site_name, reading_minutes, word_count, saved_at, progress, read_at, tags(id, name)" +
        (tag ? ", tag_filter:tags!inner(name)" : ""),
    )
    .eq("status", view);
  if (tag) query = query.eq("tag_filter.name", tag);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "simple" });

  const [{ data, error }, { data: allTags }] = await Promise.all([
    query.order("saved_at", { ascending: false }).limit(200),
    supabase.from("tags").select("name").order("name"),
  ]);
  if (error) console.error("library list failed", error);
  const articles = (data ?? []) as unknown as Item[];

  const href = (next: { view?: View; q?: string; tag?: string }) => {
    const s = new URLSearchParams();
    const v = next.view ?? view;
    if (v === "archived") s.set("view", "archive");
    const nq = next.q ?? q;
    if (nq) s.set("q", nq);
    const nt = next.tag ?? tag;
    if (nt) s.set("tag", nt);
    const qs = s.toString();
    return qs ? `/library?${qs}` : "/library";
  };
  const filtering = Boolean(q || tag);

  return (
    <section className="grid gap-4" aria-labelledby="library-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="library-heading" className="font-display text-2xl font-bold tracking-[-0.02em]">
          {view === "unread" ? "Your library" : "Archive"}
        </h1>
        <nav className="flex gap-2 text-sm" aria-label="Library views">
          <Tab href={href({ view: "unread" })} active={view === "unread"}>Unread</Tab>
          <Tab href={href({ view: "archived" })} active={view === "archived"}>Archive</Tab>
        </nav>
      </div>

      <form action="/library" className="flex gap-2" role="search">
        {view === "archived" && <input type="hidden" name="view" value="archive" />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          id="library-search"
          defaultValue={q}
          placeholder="Search titles and text"
          aria-label="Search your library"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-primary">
          Search
        </button>
      </form>

      {(allTags?.length ?? 0) > 0 && (
        <nav className="flex flex-wrap gap-2 text-xs" aria-label="Filter by tag">
          <Chip href={href({ tag: "" })} active={!tag}>All tags</Chip>
          {allTags!.map((t) => (
            <Chip key={t.name} href={href({ tag: t.name })} active={tag === t.name}>
              {t.name}
            </Chip>
          ))}
        </nav>
      )}

      {error ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
          We couldn&apos;t load your library. Refresh the page to try again.
        </p>
      ) : articles.length === 0 ? (
        <div className="grid gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
          {filtering ? (
            <>
              <p className="font-display text-lg font-bold">
                No articles match{q ? ` “${q}”` : ""}{tag ? ` in #${tag}` : ""}.
              </p>
              <p className="text-muted">
                <Link href={href({ q: "", tag: "" })} className="text-primary underline">
                  Clear the search
                </Link>{" "}
                to see everything.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-bold">
                {view === "unread" ? "Nothing tucked away yet." : "Nothing archived yet."}
              </p>
              <p className="text-muted">
                {view === "unread"
                  ? "Paste a link above to save your first article."
                  : "Articles you finish and archive will appear here."}
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {articles.map((a) => (
            <li key={a.id} className="border-t border-line first:border-t-0">
              <Link href={`/read/${a.id}`} className="grid gap-1.5 px-5 py-4 transition hover:bg-bg">
                <span className="font-read text-[1.05rem] leading-snug font-semibold">{a.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {view === "unread" && !a.read_at && (
                    <span className="size-1.5 rounded-full bg-accent" aria-label="Unread" />
                  )}
                  <span>{a.site_name ?? hostname(a.url)}</span>
                  <span>{a.word_count > 0 ? `${a.reading_minutes} min` : "Link only"}</span>
                  {progressLabel(a) && <span className="font-semibold text-primary">{progressLabel(a)}</span>}
                  <span>{savedAgo(a.saved_at)}</span>
                  {a.tags.map((t) => (
                    <span key={t.id} className="rounded-md bg-primary/12 px-1.5 py-px font-semibold text-primary">
                      {t.name}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function progressLabel(a: Item) {
  if (a.read_at) return "Read";
  if (a.progress >= 0.03) return `${Math.round(a.progress * 100)}% read`;
  return null;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-2.5 py-1 font-semibold ${
        active ? "bg-primary text-on-primary" : "bg-primary/12 text-primary hover:bg-primary/20"
      }`}
    >
      {children}
    </Link>
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
