-- Phase 05 Security & Lifecycle Refinements
-- Follow-up migration establishing explicit 42501 authorization checks and terminal revocation semantics.

-- 1. Refine admin_update_tag_status: enforce terminal revoked state (cannot reactivate revoked tag)
create or replace function public.admin_update_tag_status(_token text, _status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _current_status text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  if _status not in ('active', 'inactive', 'revoked') then
    raise exception 'Invalid tag status value'
      using errcode = '22023';
  end if;

  select status into _current_status from public.nfc_tags where token = _token;
  if not found then
    raise exception 'Tag not found'
      using errcode = 'P0002';
  end if;

  if _current_status = 'revoked' and _status <> 'revoked' then
    raise exception 'Cannot reactivate a revoked tag: revoked is a terminal state'
      using errcode = '42501';
  end if;

  update public.nfc_tags
  set status = _status
  where token = _token;

  return true;
end;
$$;

revoke all on function public.admin_update_tag_status(text, text) from public;
grant execute on function public.admin_update_tag_status(text, text) to authenticated;

-- 2. Refine admin_get_nfc_inventory: replace language SQL with PL/pgSQL explicit 42501 check
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
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  return query
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
  order by t.created_at desc;
end;
$$;

revoke all on function public.admin_get_nfc_inventory() from public;
grant execute on function public.admin_get_nfc_inventory() to authenticated;

-- 3. Refine admin_search_cards_for_assignment: replace language SQL with PL/pgSQL explicit 42501 check
create or replace function public.admin_search_cards_for_assignment(_query text default null)
returns table (
  id uuid,
  slug text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized: Admin role required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.slug,
    c.full_name
  from public.cards c
  where (
    _query is null
    or _query = ''
    or c.slug ilike '%' || _query || '%'
    or c.full_name ilike '%' || _query || '%'
  )
  order by c.full_name asc
  limit 50;
end;
$$;

revoke all on function public.admin_search_cards_for_assignment(text) from public;
grant execute on function public.admin_search_cards_for_assignment(text) to authenticated;
