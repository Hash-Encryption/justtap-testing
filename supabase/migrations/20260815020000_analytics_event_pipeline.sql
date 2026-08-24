-- Connections + Analytics Upgrade Phase 02: secure public analytics ingestion.

DO $$
BEGIN
  IF to_regclass('public.card_analytics') IS NULL THEN
    RAISE EXCEPTION 'Phase 02 preflight failed: public.card_analytics is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.card_analytics
    WHERE card_id IS NULL
      OR created_at IS NULL
      OR event_type IS NULL
  ) THEN
    RAISE EXCEPTION 'Phase 02 preflight failed: existing analytics rows require manual repair';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.analytics_event_type_is_valid(_event_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT _event_type = ANY (ARRAY[
    'page_view',
    'vcard_download',
    'phone_click',
    'email_click',
    'whatsapp_click',
    'social_click',
    'website_click',
    'share',
    'booking_click',
    'custom_cta_click',
    'pdf_download',
    'video_play',
    'wallet_add',
    'connection_submit'
  ]::text[]);
$$;

CREATE OR REPLACE FUNCTION public.analytics_metadata_is_valid(_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN _metadata IS NULL
      OR jsonb_typeof(_metadata) <> 'object'
      OR octet_length(_metadata::text) > 512
    THEN false
    ELSE
      NOT EXISTS (
        SELECT 1
        FROM jsonb_object_keys(_metadata) AS key
        WHERE key NOT IN ('referrer_host', 'device_category')
      )
      AND (
        NOT (_metadata ? 'referrer_host')
        OR (
          jsonb_typeof(_metadata -> 'referrer_host') = 'string'
          AND char_length(_metadata ->> 'referrer_host') BETWEEN 1 AND 253
          AND (_metadata ->> 'referrer_host') !~ '[[:space:]/@]'
        )
      )
      AND (
        NOT (_metadata ? 'device_category')
        OR (
          jsonb_typeof(_metadata -> 'device_category') = 'string'
          AND (_metadata ->> 'device_category') IN ('mobile', 'tablet', 'desktop')
        )
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.analytics_event_type_is_valid(text) FROM public;
REVOKE ALL ON FUNCTION public.analytics_metadata_is_valid(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_event_type_is_valid(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_metadata_is_valid(jsonb) TO service_role;

ALTER TABLE public.card_analytics
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ALTER COLUMN card_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.card_analytics
  DROP CONSTRAINT IF EXISTS card_analytics_event_type_values,
  ADD CONSTRAINT card_analytics_event_type_values
    CHECK (public.analytics_event_type_is_valid(event_type)),
  DROP CONSTRAINT IF EXISTS card_analytics_metadata_shape,
  ADD CONSTRAINT card_analytics_metadata_shape
    CHECK (public.analytics_metadata_is_valid(metadata));

COMMENT ON COLUMN public.card_analytics.event_id IS
  'Client-generated UUID. Unique per card for idempotent retry handling; null only on legacy rows.';
COMMENT ON COLUMN public.card_analytics.session_id IS
  'Optional random per-tab session UUID. No fingerprinting or cross-site identity.';
COMMENT ON COLUMN public.card_analytics.metadata IS
  'Untrusted, constrained public context: referrer host and coarse device category only.';
COMMENT ON COLUMN public.card_analytics.user_agent IS
  'Legacy-only field. The Phase 02 ingestion path does not collect raw user-agent strings.';

CREATE UNIQUE INDEX IF NOT EXISTS card_analytics_card_event_id_uidx
  ON public.card_analytics (card_id, event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS card_analytics_card_created_idx
  ON public.card_analytics (card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_analytics_card_type_created_idx
  ON public.card_analytics (card_id, event_type, created_at DESC);

ALTER TABLE public.card_analytics ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.card_analytics FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.card_analytics FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.card_analytics TO authenticated;
GRANT ALL ON TABLE public.card_analytics TO service_role;

DROP POLICY IF EXISTS "anyone can log events" ON public.card_analytics;

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
    metadata
  )
  VALUES (
    _card_id,
    _event_type,
    _event_id,
    _session_id,
    _metadata
  )
  ON CONFLICT (card_id, event_id) WHERE event_id IS NOT NULL DO NOTHING
  RETURNING true INTO _inserted;

  RETURN coalesce(_inserted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.record_public_card_event(text, text, uuid, uuid, jsonb)
  FROM public;
GRANT EXECUTE ON FUNCTION public.record_public_card_event(text, text, uuid, uuid, jsonb)
  TO anon, authenticated, service_role;
