import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Highlights · Tuckread" };

export default function HighlightsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Highlights</h1>
        <Suspense fallback={<div className="h-64 rounded-2xl border border-line bg-surface" aria-hidden="true" />}>
          <HighlightList />
        </Suspense>
      </main>
    </>
  );
}

type Row = {
  id: string;
  quote: string;
  note: string | null;
  created_at: string;
  articles: { id: string; title: string; site_name: string | null } | null;
};

async function HighlightList() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("highlights")
    .select("id, quote, note, created_at, articles(id, title, site_name)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("highlights list failed", error);
    return <p className="text-muted">We couldn&apos;t load your highlights. Refresh the page to try again.</p>;
  }

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) {
    return (
      <div className="grid gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-display text-lg font-bold">No highlights yet.</p>
        <p className="text-muted">Select a sentence while reading and choose Highlight. It will show up here.</p>
      </div>
    );
  }

  // Group by article, newest highlight first.
  const groups = new Map<string, { article: NonNullable<Row["articles"]>; items: Row[] }>();
  for (const row of rows) {
    if (!row.articles) continue;
    const g = groups.get(row.articles.id) ?? { article: row.articles, items: [] };
    g.items.push(row);
    groups.set(row.articles.id, g);
  }

  return (
    <div className="grid gap-8">
      {[...groups.values()].map(({ article, items }) => (
        <section key={article.id} className="grid gap-3">
          <div>
            <Link href={`/read/${article.id}`} className="font-read text-lg font-semibold hover:text-primary">
              {article.title}
            </Link>
            {article.site_name && <p className="text-xs text-muted">{article.site_name}</p>}
          </div>
          <ul className="grid gap-3">
            {items.map((h) => (
              <li key={h.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
                <blockquote className="border-l-[3px] border-accent pl-3 font-read leading-relaxed">{h.quote}</blockquote>
                {h.note && <p className="text-sm text-muted">{h.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
