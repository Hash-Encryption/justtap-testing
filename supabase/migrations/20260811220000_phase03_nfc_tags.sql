-- Phase 03: Permanent NFC / QR Identity Infrastructure
-- Apply through the Supabase migration runner; never paste partial statements.

create table if not exists public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  card_id uuid references public.cards(id) on delete set null,
  status text not null default 'active',
  created_at timestamp with time zone default now(),
  assigned_at timestamp with time zone
);

alter table public.nfc_tags drop constraint if exists nfc_tags_token_format;
alter table public.nfc_tags add constraint nfc_tags_token_format
  check (token ~ '^[A-Za-z0-9_-]{32}$');

alter table public.nfc_tags drop constraint if exists nfc_tags_status_values;
alter table public.nfc_tags add constraint nfc_tags_status_values
  check (status in ('active', 'inactive', 'revoked'));

create or replace function public.enforce_nfc_tag_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.token is distinct from new.token then
    raise exception 'nfc_tags token is immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists nfc_tags_enforce_immutability on public.nfc_tags;
create trigger nfc_tags_enforce_immutability
  before update on public.nfc_tags
  for each row execute function public.enforce_nfc_tag_immutability();

create or replace function public.sync_nfc_tag_assignment_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is null then
    new.assigned_at := null;
  elsif tg_op = 'INSERT' then
    new.assigned_at := now();
  elsif tg_op = 'UPDATE' then
    if new.card_id is distinct from old.card_id then
      new.assigned_at := now();
    else
      new.assigned_at := old.assigned_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists nfc_tags_sync_assignment_timestamp on public.nfc_tags;
create trigger nfc_tags_sync_assignment_timestamp
  before insert or update on public.nfc_tags
  for each row execute function public.sync_nfc_tag_assignment_timestamp();

alter table public.nfc_tags enable row level security;
revoke all on public.nfc_tags from anon, authenticated;
grant all on public.nfc_tags to service_role;

create index if not exists nfc_tags_token_idx on public.nfc_tags(token);
create index if not exists nfc_tags_card_id_idx on public.nfc_tags(card_id);

create or replace function public.get_public_card_by_tag_token(_token text)
returns table (slug text)
language sql stable security definer set search_path = public
as $$
  select c.slug
  from public.nfc_tags t
  join public.cards c on t.card_id = c.id
  where t.token = _token
    and t.status = 'active'
    and t.card_id is not null
    and c.is_active is true
    and _token ~ '^[A-Za-z0-9_-]{32}$';
$$;

revoke all on function public.get_public_card_by_tag_token(text) from public;
grant execute on function public.get_public_card_by_tag_token(text) to anon, authenticated;
