-- Tuckread Phase 1: reading progress, highlight anchoring, full-text search
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run on a database that already has the initial schema; it only adds columns and an index.

-- Reading progress: how far down the article the reader got (0 = top, 1 = end)
alter table public.articles
  add column if not exists progress real not null default 0 check (progress >= 0 and progress <= 1);

-- Full-text search over title, site, excerpt and article text.
-- 'simple' config: no language-specific stemming, so Turkish and English both work.
alter table public.articles
  add column if not exists search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(site_name, '') || ' ' || coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', left(regexp_replace(coalesce(content_html, ''), '<[^>]+>', ' ', 'g'), 200000)), 'C')
  ) stored;

create index if not exists articles_search_idx on public.articles using gin (search);

-- Highlights: a little text before and after the quote, so the same words appearing twice
-- in an article can be told apart when the highlight is drawn again.
alter table public.highlights
  add column if not exists prefix text not null default '',
  add column if not exists suffix text not null default '';

-- Existing grants on these tables cover the new columns; no RLS changes needed.
