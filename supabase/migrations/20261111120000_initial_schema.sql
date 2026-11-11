-- Tuckread initial schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Every table has Row Level Security: a signed-in user can only see and change their own rows.

-- Articles a user has saved
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url text not null,
  title text not null,
  site_name text,
  byline text,
  excerpt text,
  content_html text,
  word_count integer not null default 0,
  reading_minutes integer not null default 1,
  status text not null default 'unread' check (status in ('unread', 'archived')),
  is_favorite boolean not null default false,
  summary text,
  saved_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, url)
);
create index articles_user_saved_idx on public.articles (user_id, saved_at desc);

-- Tags, per user ("design", "cooking", ...)
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index tags_user_name_idx on public.tags (user_id, lower(name));

-- Which tags are on which article
create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (article_id, tag_id)
);

-- Highlighted passages and notes
create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  quote text not null,
  note text,
  created_at timestamptz not null default now()
);
create index highlights_article_idx on public.highlights (article_id);

-- Row Level Security
alter table public.articles enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;
alter table public.highlights enable row level security;

create policy "Users manage their own articles" on public.articles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own tags" on public.tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users tag their own articles" on public.article_tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );

create policy "Users manage their own highlights" on public.highlights
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.user_id = (select auth.uid()))
  );

-- New tables are not exposed to the Data API automatically in this project, so grant access explicitly.
-- Only signed-in users get access; anonymous visitors get none.
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.articles, public.tags, public.article_tags, public.highlights
  to authenticated;
