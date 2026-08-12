-- Phase 05: Admin Authority & NFC Tag Provisioning
-- Apply through the Supabase migration runner; never paste partial statements.

create extension if not exists pgcrypto;

-- 1. Helper function for cryptographically secure 32-character NFC token generation
create or replace function public.generate_nfc_token()
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  result text := '';
  i integer;
  bytes bytea;
begin
  begin
    bytes := gen_random_bytes(32);
  exception when others then
    bytes := extensions.gen_random_bytes(32);
  end;

  for i in 1..32 loop
    result := result || substr(chars, (get_byte(bytes, i - 1) % 64) + 1, 1);
  end loop;
  return result;
end;
$$;

revoke all on function public.generate_nfc_token() from public;

-- 2. Privileged RPC: Provision a new NFC tag with a server-generated permanent token
create or replace function public.admin_provision_nfc_tag(_card_id uuid default null)
returns table (
  id uuid,
  token text,
  card_id uuid,
  status text,
  created_at timestamp with time zone,
  assigned_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _token text;
  _tries integer := 0;
  _new_tag public.nfc_tags%rowtype;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  if _card_id is not null then
    if not exists (select 1 from public.cards c where c.id = _card_id) then
      raise exception 'Invalid card_id: target card does not exist'
        using errcode = '23503';
    end if;
  end if;

  loop
    _token := public.generate_nfc_token();
    begin
      insert into public.nfc_tags (token, card_id, status)
      values (_token, _card_id, 'active')
      returning * into _new_tag;
      exit;
    exception when unique_violation then
      _tries := _tries + 1;
      if _tries > 10 then
        raise exception 'Failed to generate unique NFC tag token after multiple attempts'
          using errcode = '54000';
      end if;
    end;
  end loop;

  return query
  select _new_tag.id, _new_tag.token, _new_tag.card_id, _new_tag.status, _new_tag.created_at, _new_tag.assigned_at;
end;
$$;

revoke all on function public.admin_provision_nfc_tag(uuid) from public;
grant execute on function public.admin_provision_nfc_tag(uuid) to authenticated;

-- 3. Privileged RPC: Assign or reassign an existing tag to a target card
create or replace function public.admin_assign_nfc_tag(_token text, _card_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _tag public.nfc_tags%rowtype;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  if not _token ~ '^[A-Za-z0-9_-]{32}$' then
    raise exception 'Invalid tag token format'
      using errcode = '22023';
  end if;

  select * into _tag from public.nfc_tags where token = _token;
  if not found then
    raise exception 'Tag not found'
      using errcode = 'P0002';
  end if;

  if _tag.status = 'revoked' then
    raise exception 'Cannot assign a revoked tag'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.cards where id = _card_id) then
    raise exception 'Target card does not exist'
      using errcode = '23503';
  end if;

  update public.nfc_tags
  set card_id = _card_id
  where token = _token;

  return true;
end;
$$;

revoke all on function public.admin_assign_nfc_tag(text, uuid) from public;
grant execute on function public.admin_assign_nfc_tag(text, uuid) to authenticated;

-- 4. Privileged RPC: Update tag lifecycle status (active, inactive, revoked)
create or replace function public.admin_update_tag_status(_token text, _status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  if _status not in ('active', 'inactive', 'revoked') then
    raise exception 'Invalid tag status value'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.nfc_tags where token = _token) then
    raise exception 'Tag not found'
      using errcode = 'P0002';
  end if;

  update public.nfc_tags
  set status = _status
  where token = _token;

  return true;
end;
$$;

revoke all on function public.admin_update_tag_status(text, text) from public;
grant execute on function public.admin_update_tag_status(text, text) to authenticated;

-- 5. Privileged RPC: Get narrow NFC inventory list
create or replace function public.admin_get_nfc_inventory()
returns table (
  tag_id uuid,
  token text,
  status text,
  created_at timestamp with time zone,
  assigned_at timestamp with time zone,
  card_id uuid,
  card_slug text,
  card_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id as tag_id,
    t.token,
    t.status,
    t.created_at,
    t.assigned_at,
    t.card_id,
    c.slug as card_slug,
    c.full_name as card_name
  from public.nfc_tags t
  left join public.cards c on t.card_id = c.id
  where public.has_role(auth.uid(), 'admin')
  order by t.created_at desc;
$$;

revoke all on function public.admin_get_nfc_inventory() from public;
grant execute on function public.admin_get_nfc_inventory() to authenticated;

-- 6. Privileged RPC: Narrow card lookup for tag assignment dropdowns
create or replace function public.admin_search_cards_for_assignment(_query text default null)
returns table (
  id uuid,
  slug text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    c.full_name
  from public.cards c
  where public.has_role(auth.uid(), 'admin')
    and (
      _query is null
      or _query = ''
      or c.slug ilike '%' || _query || '%'
      or c.full_name ilike '%' || _query || '%'
    )
  order by c.full_name asc
  limit 50;
$$;

revoke all on function public.admin_search_cards_for_assignment(text) from public;
grant execute on function public.admin_search_cards_for_assignment(text) to authenticated;
