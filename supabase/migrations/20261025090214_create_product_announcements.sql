create table public.product_announcements (
  id text primary key,
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 500),
  action_label text check (action_label is null or char_length(action_label) between 1 and 40),
  target_route text check (target_route is null or target_route in ('handoff', 'history', 'baby', 'family', 'settings')),
  platforms text[] not null check (platforms <@ array['web', 'android', 'ios']::text[] and cardinality(platforms) > 0),
  minimum_native_version text,
  delivery text not null default 'in_app' check (delivery in ('in_app', 'push_and_in_app')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  expires_at timestamptz,
  source_commit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.product_announcement_reads (
  announcement_id text not null references public.product_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index product_announcements_published_idx on public.product_announcements (published_at desc) where status = 'published';
create index product_announcement_reads_user_idx on public.product_announcement_reads (user_id, seen_at desc);

alter table public.product_announcements enable row level security;
alter table public.product_announcement_reads enable row level security;

create policy "Authenticated users can read active product announcements"
on public.product_announcements for select to authenticated
using (status = 'published' and published_at <= now() and (expires_at is null or expires_at > now()));

create policy "Users can read their own product announcement receipts"
on public.product_announcement_reads for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can mark product announcements as seen"
on public.product_announcement_reads for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can refresh their own product announcement receipts"
on public.product_announcement_reads for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.product_announcements from public, anon;
revoke all on table public.product_announcement_reads from public, anon;
grant select on table public.product_announcements to authenticated;
grant select, insert, update on table public.product_announcement_reads to authenticated;
grant all on table public.product_announcements to service_role;
grant all on table public.product_announcement_reads to service_role;
