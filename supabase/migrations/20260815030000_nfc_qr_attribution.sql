-- Connections + Analytics Upgrade Phase 03: honest NFC / QR entry attribution.

DO $$
BEGIN
  IF to_regclass('public.card_analytics') IS NULL
    OR to_regclass('public.nfc_tags') IS NULL
    OR to_regprocedure('public.record_public_card_event(text,text,uuid,uuid,jsonb)') IS NULL
  THEN
    RAISE EXCEPTION 'Phase 03 preflight failed: analytics or NFC foundation is missing';
  END IF;
END
$$;

ALTER TABLE public.card_analytics
  ADD COLUMN IF NOT EXISTS entry_source text;

ALTER TABLE public.card_analytics
  ADD CONSTRAINT card_analytics_entry_source_values
    CHECK (
      entry_source IS NULL
      OR (
        event_type = 'page_view'
        AND entry_source IN ('direct', 'profile_qr', 'permanent_tag')
      )
    );

COMMENT ON COLUMN public.card_analytics.entry_source IS
  'Entry-only page-view attribution. Null means a non-entry event or preserved pre-Phase-03 history.';

CREATE OR REPLACE FUNCTION public.insert_public_card_event(
  _card_slug text,
  _event_type text,
  _event_id uuid,
  _session_id uuid,
  _metadata jsonb,
  _entry_source text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _card_id uuid;
  _inserted boolean := false;
BEGIN
  _card_slug := btrim(_card_slug);
  _event_type := btrim(_event_type);
  _metadata := coalesce(_metadata, '{}'::jsonb);

  IF _card_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    OR char_length(_card_slug) NOT BETWEEN 2 AND 48
    OR _event_id IS NULL
    OR NOT public.analytics_event_type_is_valid(_event_type)
    OR NOT public.analytics_metadata_is_valid(_metadata)
    OR (_event_type = 'page_view' AND _entry_source IS NULL)
    OR (_event_type <> 'page_view' AND _entry_source IS NOT NULL)
    OR (_entry_source IS NOT NULL AND _entry_source NOT IN ('direct', 'profile_qr', 'permanent_tag'))
  THEN
    RAISE EXCEPTION 'Invalid analytics event' USING errcode = '22023';
  END IF;

  SELECT card.id
  INTO _card_id
  FROM public.cards AS card
  WHERE card.slug = _card_slug
    AND card.is_active IS true;

  IF _card_id IS NULL THEN
    RAISE EXCEPTION 'Analytics event unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.card_analytics (
    card_id,
    event_type,
    event_id,
    session_id,
    metadata,
    entry_source
  )
  VALUES (
    _card_id,
    _event_type,
    _event_id,
    _session_id,
    _metadata,
    _entry_source
  )
  ON CONFLICT (card_id, event_id) WHERE event_id IS NOT NULL DO NOTHING
  RETURNING true INTO _inserted;

  RETURN coalesce(_inserted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.insert_public_card_event(text, text, uuid, uuid, jsonb, text)
  FROM public;

CREATE OR REPLACE FUNCTION public.record_public_card_event(
  _card_slug text,
  _event_type text,
  _event_id uuid,
  _session_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.insert_public_card_event(
    _card_slug,
    _event_type,
    _event_id,
    _session_id,
    _metadata,
    CASE WHEN btrim(_event_type) = 'page_view' THEN 'direct' ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_public_profile_qr_page_view(
  _card_slug text,
  _event_id uuid,
  _session_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.insert_public_card_event(
    _card_slug,
    'page_view',
    _event_id,
    _session_id,
    _metadata,
    'profile_qr'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_public_tag_page_view(
  _token text,
  _event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _card_slug text;
BEGIN
  _token := btrim(_token);

  IF _token IS NULL
    OR _token !~ '^[A-Za-z0-9_-]{32}$'
    OR _event_id IS NULL
  THEN
    RAISE EXCEPTION 'Analytics event unavailable' USING errcode = '22023';
  END IF;

  SELECT card.slug
  INTO _card_slug
  FROM public.nfc_tags AS tag
  JOIN public.cards AS card ON card.id = tag.card_id
  WHERE tag.token = _token
    AND tag.status = 'active'
    AND card.is_active IS true;

  IF _card_slug IS NULL THEN
    RAISE EXCEPTION 'Analytics event unavailable' USING errcode = '22023';
  END IF;

  RETURN public.insert_public_card_event(
    _card_slug,
    'page_view',
    _event_id,
    NULL,
    '{}'::jsonb,
    'permanent_tag'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_public_card_event(text, text, uuid, uuid, jsonb)
  FROM public;
REVOKE ALL ON FUNCTION public.record_public_profile_qr_page_view(text, uuid, uuid, jsonb)
  FROM public;
REVOKE ALL ON FUNCTION public.record_public_tag_page_view(text, uuid)
  FROM public;

GRANT EXECUTE ON FUNCTION public.record_public_card_event(text, text, uuid, uuid, jsonb)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_public_profile_qr_page_view(text, uuid, uuid, jsonb)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_public_tag_page_view(text, uuid)
  TO anon, authenticated, service_role;
