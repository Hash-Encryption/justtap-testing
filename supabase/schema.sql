-- ============================================================
-- Digital Business Card SaaS — full schema, RLS and storage
-- Run this once in your Supabase project (SQL Editor → New query).
-- ============================================================

-- ---------- ROLES (admin portal) ----------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "admins read all roles" on public.user_roles;
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------- CARDS ----------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slug text unique not null,
  full_name text not null,
  phone text not null,
  email text,
  title text,
  company text,
  bio text,
  avatar_url text,
  logo_url text,
  show_logo_badge boolean default true,
  header_pattern text default 'wave',
  accent_color text default '#8b5cf6',
  bg_color text default '#ffffff',
  whatsapp_phone text,
  whatsapp_message text default 'Hi! I just scanned your digital card.',
  enable_arabic boolean default false,
  full_name_ar text,
  title_ar text,
  bio_ar text,
  social_links jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

grant select on public.cards to anon;
grant select, insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;
alter table public.cards enable row level security;

drop policy if exists "cards are publicly readable" on public.cards;
create policy "cards are publicly readable" on public.cards
  for select using (true);

drop policy if exists "owners insert own cards" on public.cards;
create policy "owners insert own cards" on public.cards
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "owners update own cards" on public.cards;
create policy "owners update own cards" on public.cards
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owners delete own cards" on public.cards;
create policy "owners delete own cards" on public.cards
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "admins manage all cards" on public.cards;
create policy "admins manage all cards" on public.cards
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- LEADS ----------
create table if not exists public.card_leads (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  sender_name text not null,
  sender_phone text not null,
  note text,
  created_at timestamp with time zone default now()
);

grant insert on public.card_leads to anon;
grant select, insert, delete on public.card_leads to authenticated;
grant all on public.card_leads to service_role;
alter table public.card_leads enable row level security;

drop policy if exists "anyone can submit a lead" on public.card_leads;
create policy "anyone can submit a lead" on public.card_leads
  for insert with check (true);

drop policy if exists "owners read their leads" on public.card_leads;
create policy "owners read their leads" on public.card_leads
  for select to authenticated using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "owners delete their leads" on public.card_leads;
create policy "owners delete their leads" on public.card_leads
  for delete to authenticated using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------- ANALYTICS ----------
create table if not exists public.card_analytics (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  event_type text not null,
  user_agent text,
  created_at timestamp with time zone default now()
);

grant insert on public.card_analytics to anon;
grant select, insert, delete on public.card_analytics to authenticated;
grant all on public.card_analytics to service_role;
alter table public.card_analytics enable row level security;

drop policy if exists "anyone can log events" on public.card_analytics;
create policy "anyone can log events" on public.card_analytics
  for insert with check (event_type in ('page_view', 'vcard_download'));

drop policy if exists "owners read their analytics" on public.card_analytics;
create policy "owners read their analytics" on public.card_analytics
  for select to authenticated using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "owners delete their analytics" on public.card_analytics;
create policy "owners delete their analytics" on public.card_analytics
  for delete to authenticated using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

create index if not exists card_analytics_card_id_idx on public.card_analytics(card_id);
create index if not exists card_leads_card_id_idx on public.card_leads(card_id);
create index if not exists cards_slug_idx on public.cards(slug);

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public)
values ('card-assets', 'card-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "card assets are public" on storage.objects;
create policy "card assets are public" on storage.objects
  for select using (bucket_id = 'card-assets');

drop policy if exists "users upload card assets" on storage.objects;
create policy "users upload card assets" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update card assets" on storage.objects;
create policy "users update card assets" on storage.objects
  for update to authenticated using (
    bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete card assets" on storage.objects;
create policy "users delete card assets" on storage.objects
  for delete to authenticated using (
    bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- MAKE YOURSELF ADMIN ----------
-- After signing up, run:
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'you@example.com'
-- on conflict do nothing;
