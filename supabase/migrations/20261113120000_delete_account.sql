-- Lets a signed-in user delete their own account from Settings.
-- Deleting the auth.users row cascades to articles, tags, article_tags and highlights.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
