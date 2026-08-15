-- Phase 01: secure Connections data model and public capture boundary.

DO $$
BEGIN
  IF to_regclass('public.card_leads') IS NULL THEN
    RAISE EXCEPTION 'Phase 01 preflight failed: public.card_leads is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.card_leads
    WHERE card_id IS NULL
      OR created_at IS NULL
      OR char_length(btrim(sender_name)) NOT BETWEEN 1 AND 100
      OR char_length(btrim(sender_phone)) NOT BETWEEN 3 AND 30
      OR sender_phone !~ '^\+?[0-9() -]{3,30}$'
      OR (note IS NOT NULL AND char_length(note) > 1000)
  ) THEN
    RAISE EXCEPTION 'Phase 01 preflight failed: existing card_leads require manual repair';
  END IF;
END
$$;

ALTER TABLE public.card_leads
  ADD COLUMN IF NOT EXISTS sender_email text,
  ADD COLUMN IF NOT EXISTS sender_company text,
  ADD COLUMN IF NOT EXISTS sender_job_title text,
  ADD COLUMN IF NOT EXISTS owner_note text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ALTER COLUMN card_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.connection_tags_are_valid(_tags text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT cardinality(_tags) <= 20
    AND cardinality(_tags) = count(tag)
    AND coalesce(bool_and(tag = btrim(tag) AND char_length(tag) BETWEEN 1 AND 40), true)
  FROM unnest(_tags) AS tag;
$$;

REVOKE ALL ON FUNCTION public.connection_tags_are_valid(text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.connection_tags_are_valid(text[]) TO authenticated, service_role;

ALTER TABLE public.card_leads
  DROP CONSTRAINT IF EXISTS card_leads_sender_name_length,
  ADD CONSTRAINT card_leads_sender_name_length
    CHECK (char_length(btrim(sender_name)) BETWEEN 1 AND 100),
  DROP CONSTRAINT IF EXISTS card_leads_sender_phone_format,
  ADD CONSTRAINT card_leads_sender_phone_format
    CHECK (
      char_length(btrim(sender_phone)) BETWEEN 3 AND 30
      AND btrim(sender_phone) ~ '^\+?[0-9() -]{3,30}$'
    ),
  DROP CONSTRAINT IF EXISTS card_leads_sender_email_format,
  ADD CONSTRAINT card_leads_sender_email_format
    CHECK (
      sender_email IS NULL
      OR (
        char_length(sender_email) BETWEEN 3 AND 254
        AND sender_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  DROP CONSTRAINT IF EXISTS card_leads_sender_company_length,
  ADD CONSTRAINT card_leads_sender_company_length
    CHECK (sender_company IS NULL OR char_length(sender_company) <= 160),
  DROP CONSTRAINT IF EXISTS card_leads_sender_job_title_length,
  ADD CONSTRAINT card_leads_sender_job_title_length
    CHECK (sender_job_title IS NULL OR char_length(sender_job_title) <= 160),
  DROP CONSTRAINT IF EXISTS card_leads_visitor_note_length,
  ADD CONSTRAINT card_leads_visitor_note_length
    CHECK (note IS NULL OR char_length(note) <= 1000),
  DROP CONSTRAINT IF EXISTS card_leads_owner_note_length,
  ADD CONSTRAINT card_leads_owner_note_length
    CHECK (owner_note IS NULL OR char_length(owner_note) <= 2000),
  DROP CONSTRAINT IF EXISTS card_leads_status_values,
  ADD CONSTRAINT card_leads_status_values
    CHECK (status IN ('new', 'follow_up', 'contacted', 'done')),
  DROP CONSTRAINT IF EXISTS card_leads_tags_valid,
  ADD CONSTRAINT card_leads_tags_valid
    CHECK (public.connection_tags_are_valid(tags));

COMMENT ON COLUMN public.card_leads.note IS
  'Information submitted by the public visitor; never an owner-private note.';
COMMENT ON COLUMN public.card_leads.owner_note IS
  'Private owner-management note; public capture cannot write this column.';
COMMENT ON COLUMN public.card_leads.tags IS
  'Private owner-management tags; public capture cannot write this column.';

CREATE OR REPLACE FUNCTION public.set_card_lead_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_card_lead_updated_at() FROM public;

DROP TRIGGER IF EXISTS card_leads_set_updated_at ON public.card_leads;
CREATE TRIGGER card_leads_set_updated_at
  BEFORE UPDATE ON public.card_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_card_lead_updated_at();

CREATE INDEX IF NOT EXISTS card_leads_card_status_created_idx
  ON public.card_leads (card_id, status, created_at DESC);

ALTER TABLE public.card_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.card_leads FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.card_leads FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.card_leads TO authenticated;
GRANT UPDATE (owner_note, status, tags) ON TABLE public.card_leads TO authenticated;
GRANT ALL ON TABLE public.card_leads TO service_role;

DROP POLICY IF EXISTS "anyone can submit a lead" ON public.card_leads;
DROP POLICY IF EXISTS "owners read their leads" ON public.card_leads;
CREATE POLICY "owners read their connections"
  ON public.card_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards AS card
      WHERE card.id = card_leads.card_id
        AND card.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "owners delete their leads" ON public.card_leads;
CREATE POLICY "owners delete their connections"
  ON public.card_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards AS card
      WHERE card.id = card_leads.card_id
        AND card.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "pro owners update connection management" ON public.card_leads;
CREATE POLICY "pro owners update connection management"
  ON public.card_leads
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1
        FROM public.cards AS card
        WHERE card.id = card_leads.card_id
          AND card.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.user_id = auth.uid()
          AND profile.plan_tier IN ('pro', 'enterprise')
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM public.cards AS card
        WHERE card.id = card_leads.card_id
          AND card.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.user_id = auth.uid()
          AND profile.plan_tier IN ('pro', 'enterprise')
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.create_public_connection(
  _card_slug text,
  _sender_name text,
  _sender_phone text,
  _sender_email text DEFAULT NULL,
  _sender_company text DEFAULT NULL,
  _sender_job_title text DEFAULT NULL,
  _visitor_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _card_id uuid;
  _connection_id uuid;
BEGIN
  _card_slug := btrim(_card_slug);
  _sender_name := btrim(_sender_name);
  _sender_phone := btrim(_sender_phone);
  _sender_email := nullif(btrim(_sender_email), '');
  _sender_company := nullif(btrim(_sender_company), '');
  _sender_job_title := nullif(btrim(_sender_job_title), '');
  _visitor_note := nullif(btrim(_visitor_note), '');

  IF _card_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    OR char_length(_card_slug) NOT BETWEEN 2 AND 48
    OR char_length(_sender_name) NOT BETWEEN 1 AND 100
    OR char_length(_sender_phone) NOT BETWEEN 3 AND 30
    OR _sender_phone !~ '^\+?[0-9() -]{3,30}$'
    OR (_sender_email IS NOT NULL AND (
      char_length(_sender_email) NOT BETWEEN 3 AND 254
      OR _sender_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    OR (_sender_company IS NOT NULL AND char_length(_sender_company) > 160)
    OR (_sender_job_title IS NOT NULL AND char_length(_sender_job_title) > 160)
    OR (_visitor_note IS NOT NULL AND char_length(_visitor_note) > 1000)
  THEN
    RAISE EXCEPTION 'Invalid connection submission' USING errcode = '22023';
  END IF;

  SELECT card.id
  INTO _card_id
  FROM public.cards AS card
  WHERE card.slug = _card_slug
    AND card.is_active IS true;

  IF _card_id IS NULL THEN
    RAISE EXCEPTION 'Connection submission unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.card_leads (
    card_id,
    sender_name,
    sender_phone,
    sender_email,
    sender_company,
    sender_job_title,
    note
  )
  VALUES (
    _card_id,
    _sender_name,
    _sender_phone,
    _sender_email,
    _sender_company,
    _sender_job_title,
    _visitor_note
  )
  RETURNING id INTO _connection_id;

  RETURN _connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_connection(
  text, text, text, text, text, text, text
) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_connection(
  text, text, text, text, text, text, text
) TO anon, authenticated;
