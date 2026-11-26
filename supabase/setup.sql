-- =============================================================
--  Life Dashboard: Supabase setup
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Safe to run again.
-- =============================================================

-- One table holds everything: tasks, goals, programs, photos...
-- `kind` says what it is; `data` holds its fields.
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_user_kind_idx on public.items (user_id, kind);

-- Row Level Security: each signed-in user can only see and change their own rows.
alter table public.items enable row level security;

drop policy if exists "items: read own"   on public.items;
drop policy if exists "items: insert own" on public.items;
drop policy if exists "items: update own" on public.items;
drop policy if exists "items: delete own" on public.items;

create policy "items: read own"   on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "items: insert own" on public.items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "items: update own" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "items: delete own" on public.items for delete to authenticated using ((select auth.uid()) = user_id);

-- Private photo storage. Each user's photos live in a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: read own"   on storage.objects;
drop policy if exists "photos: upload own" on storage.objects;
drop policy if exists "photos: delete own" on storage.objects;

create policy "photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
