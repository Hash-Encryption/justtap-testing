-- Phase 02: narrow public-card RPC, owner RLS, and trusted entitlement fields.
-- Apply through the Supabase migration runner; never paste partial statements.

do $$
begin
  if exists (
    select 1 from public.cards
    where user_id is null
       or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(slug) not between 2 and 48
       or plan_tier is null
       or plan_tier not in ('free', 'pro', 'enterprise')
  ) then
    raise exception 'Phase 02 preflight failed: repair invalid cards before applying this migration';
  end if;
end $$;

alter table public.cards
  alter column user_id set not null,
  alter column plan_tier set default 'free',
  alter column plan_tier set not null;

alter table public.cards drop constraint if exists cards_slug_format;
alter table public.cards add constraint cards_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 48);
alter table public.cards drop constraint if exists cards_plan_tier_values;
alter table public.cards add constraint cards_plan_tier_values
  check (plan_tier in ('free', 'pro', 'enterprise'));

revoke all on public.cards from anon;
grant select, insert, update, delete on public.cards to authenticated;

drop policy if exists "cards are publicly readable" on public.cards;
drop policy if exists "owners read own cards" on public.cards;
create policy "owners read own cards" on public.cards
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "owners insert own cards" on public.cards;
create policy "owners insert own cards" on public.cards
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "owners update own cards" on public.cards;
create policy "owners update own cards" on public.cards
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owners delete own cards" on public.cards;
create policy "owners delete own cards" on public.cards
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.reject_client_card_entitlement_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and (
    (tg_op = 'INSERT' and new.plan_tier <> 'free')
    or (tg_op = 'UPDATE' and new.plan_tier is distinct from old.plan_tier)
  ) then
    raise exception 'plan_tier is controlled by trusted billing or admin operations'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_reject_client_entitlement_change on public.cards;
create trigger cards_reject_client_entitlement_change
  before insert or update on public.cards
  for each row execute function public.reject_client_card_entitlement_change();

create or replace function public.get_public_card_by_slug(_slug text)
returns table (
  id uuid, slug text, full_name text, phone text, email text, title text,
  company text, bio text, avatar_url text, logo_url text, show_logo_badge boolean,
  header_pattern text, accent_color text, bg_color text, whatsapp_phone text,
  whatsapp_message text, enable_arabic boolean, full_name_ar text, title_ar text,
  bio_ar text, social_links jsonb, public_features jsonb,
  public_features_enabled boolean, show_branding boolean
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.slug, c.full_name, c.phone, c.email, c.title, c.company, c.bio,
    c.avatar_url, c.logo_url, c.show_logo_badge, c.header_pattern, c.accent_color,
    c.bg_color, c.whatsapp_phone, c.whatsapp_message, c.enable_arabic,
    c.full_name_ar, c.title_ar, c.bio_ar, c.social_links,
    case when c.plan_tier in ('pro', 'enterprise') then jsonb_build_object(
      'video_url', c.pro_features->'video_url', 'pdf_url', c.pro_features->'pdf_url',
      'pdf_label', c.pro_features->'pdf_label', 'booking_url', c.pro_features->'booking_url',
      'custom_cta_label', c.pro_features->'custom_cta_label',
      'custom_cta_url', c.pro_features->'custom_cta_url'
    ) else null end,
    c.plan_tier in ('pro', 'enterprise'),
    not (c.plan_tier in ('pro', 'enterprise') and coalesce((c.pro_features->>'remove_branding')::boolean, false))
  from public.cards c
  where c.slug = _slug and c.is_active is true
    and _slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(_slug) between 2 and 48;
$$;

revoke all on function public.get_public_card_by_slug(text) from public;
grant execute on function public.get_public_card_by_slug(text) to anon, authenticated;
