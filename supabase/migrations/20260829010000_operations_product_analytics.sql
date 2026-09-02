-- JustTap testing-first Phase 2: Operations, trusted product events, and audit.
--
-- Forward-only rules:
-- - Existing active cards are counted as current-state active, but receive no
--   invented historical publication timestamp.
-- - Product activity begins with this testing release; no history is fabricated.
-- - All privileged reads and writes fail closed unless user_roles.role = admin.

-- ---------------------------------------------------------------------------
-- Shared admin guard and append-only audit log
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'Administrator authorization required' USING ERRCODE = '42501';
  END IF;
  RETURN _actor;
END;
$$;

REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  result TEXT NOT NULL DEFAULT 'success',
  change_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  environment TEXT NOT NULL DEFAULT 'testing',
  release_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_action_shape CHECK (
    action ~ '^[a-z][a-z0-9_]{2,63}$'
  ),
  CONSTRAINT admin_audit_target_shape CHECK (
    target_type ~ '^[a-z][a-z0-9_]{1,31}$'
  ),
  CONSTRAINT admin_audit_result_values CHECK (
    result IN ('success', 'rejected', 'failed')
  ),
  CONSTRAINT admin_audit_environment_testing CHECK (environment = 'testing'),
  CONSTRAINT admin_audit_release_length CHECK (
    release_identifier IS NULL OR char_length(release_identifier) <= 80
  ),
  CONSTRAINT admin_audit_summary_object CHECK (
    jsonb_typeof(change_summary) = 'object'
    AND octet_length(change_summary::text) <= 2048
    AND NOT (change_summary ?| ARRAY[
      'password', 'token', 'secret', 'authorization', 'cookie',
      'payment', 'card_number', 'connection', 'message', 'note'
    ])
  )
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON public.admin_audit_log (actor_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.append_admin_audit(
  _action TEXT,
  _target_type TEXT,
  _target_id TEXT DEFAULT NULL,
  _result TEXT DEFAULT 'success',
  _change_summary JSONB DEFAULT '{}'::jsonb,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID;
  _audit_id UUID;
BEGIN
  _actor := public.require_admin();

  INSERT INTO public.admin_audit_log (
    actor_user_id, action, target_type, target_id, result,
    change_summary, release_identifier
  ) VALUES (
    _actor, _action, _target_type, _target_id, _result,
    COALESCE(_change_summary, '{}'::jsonb), _release_identifier
  )
  RETURNING id INTO _audit_id;

  RETURN _audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_admin_audit(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Prevent UPDATE/DELETE even from accidental direct use by ordinary roles.
CREATE OR REPLACE FUNCTION public.reject_admin_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit records are append-only' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_log_append_only ON public.admin_audit_log;
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_admin_audit_change();

-- ---------------------------------------------------------------------------
-- Forward-only card lifecycle timestamps
-- ---------------------------------------------------------------------------

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS cards_updated_at_idx
  ON public.cards (updated_at DESC) WHERE updated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS cards_published_at_idx
  ON public.cards (published_at DESC) WHERE published_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.capture_card_lifecycle_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active IS TRUE AND NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  ELSIF NEW.is_active IS TRUE
    AND OLD.is_active IS DISTINCT FROM TRUE
    AND NEW.published_at IS NULL
  THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_capture_lifecycle_timestamps ON public.cards;
CREATE TRIGGER cards_capture_lifecycle_timestamps
  BEFORE INSERT OR UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.capture_card_lifecycle_timestamps();

-- Intentionally do not backfill existing rows. A null timestamp means that the
-- historical moment was not tracked before this testing release.

-- ---------------------------------------------------------------------------
-- Privacy-safe internal product events (separate from card_analytics)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  session_id UUID,
  feature TEXT,
  source TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  environment TEXT NOT NULL DEFAULT 'testing',
  release_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_event_name_allowlist CHECK (event_name IN (
    'signup_completed',
    'card_created',
    'card_edit_started',
    'profile_completed',
    'card_published',
    'card_deactivated',
    'feature_used',
    'pro_feature_view',
    'pro_preview_started',
    'pro_preview_interaction',
    'pro_preview_configured',
    'pro_upgrade_clicked',
    'trial_started',
    'entitlement_changed'
  )),
  CONSTRAINT product_event_source_allowlist CHECK (source IN (
    'auth', 'dashboard', 'editor', 'pro_preview', 'billing', 'admin', 'public_card'
  )),
  CONSTRAINT product_event_feature_shape CHECK (
    feature IS NULL OR feature ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  CONSTRAINT product_event_environment_testing CHECK (environment = 'testing'),
  CONSTRAINT product_event_release_length CHECK (
    release_identifier IS NULL OR char_length(release_identifier) <= 80
  ),
  CONSTRAINT product_event_metadata_object CHECK (
    jsonb_typeof(metadata) = 'object' AND octet_length(metadata::text) <= 1024
  ),
  CONSTRAINT product_event_metadata_keys CHECK (
    metadata - ARRAY[
      'plan_tier', 'previous_plan_tier', 'interaction', 'completion_state',
      'cta', 'entry_surface', 'card_state'
    ] = '{}'::jsonb
  )
);

CREATE INDEX IF NOT EXISTS product_events_created_idx
  ON public.product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_created_idx
  ON public.product_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_events_card_created_idx
  ON public.product_events (card_id, created_at DESC) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_events_name_created_idx
  ON public.product_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_session_created_idx
  ON public.product_events (session_id, created_at DESC) WHERE session_id IS NOT NULL;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.product_events TO service_role;

CREATE OR REPLACE FUNCTION public.capture_authoritative_product_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _source TEXT;
BEGIN
  _source := CASE
    WHEN auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN 'admin'
    WHEN TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN 'auth'
    WHEN TG_TABLE_NAME = 'profiles' THEN 'billing'
    ELSE 'editor'
  END;

  IF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.product_events (event_id, event_name, user_id, source)
      VALUES (gen_random_uuid(), 'signup_completed', NEW.user_id, 'auth');
    ELSIF TG_OP = 'UPDATE' AND NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      INSERT INTO public.product_events (
        event_id, event_name, user_id, source, metadata
      ) VALUES (
        gen_random_uuid(),
        CASE WHEN NEW.plan_tier = 'trialing' THEN 'trial_started' ELSE 'entitlement_changed' END,
        NEW.user_id,
        _source,
        jsonb_build_object(
          'previous_plan_tier', OLD.plan_tier,
          'plan_tier', NEW.plan_tier
        )
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'cards' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.product_events (
        event_id, event_name, user_id, card_id, source,
        metadata
      ) VALUES (
        gen_random_uuid(), 'card_created', NEW.user_id, NEW.id, _source,
        jsonb_build_object('card_state', CASE WHEN NEW.is_active IS TRUE THEN 'live' ELSE 'draft' END)
      );
      IF NEW.is_active IS TRUE THEN
        INSERT INTO public.product_events (event_id, event_name, user_id, card_id, source)
        VALUES (gen_random_uuid(), 'card_published', NEW.user_id, NEW.id, _source);
      END IF;
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      INSERT INTO public.product_events (event_id, event_name, user_id, card_id, source)
      VALUES (
        gen_random_uuid(),
        CASE WHEN NEW.is_active IS TRUE THEN 'card_published' ELSE 'card_deactivated' END,
        NEW.user_id, NEW.id, _source
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_authoritative_product_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_capture_product_events ON public.profiles;
CREATE TRIGGER profiles_capture_product_events
  AFTER INSERT OR UPDATE OF plan_tier ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.capture_authoritative_product_event();

DROP TRIGGER IF EXISTS cards_capture_product_events ON public.cards;
CREATE TRIGGER cards_capture_product_events
  AFTER INSERT OR UPDATE OF is_active ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.capture_authoritative_product_event();

CREATE OR REPLACE FUNCTION public.record_product_event(
  _event_id UUID,
  _event_name TEXT,
  _card_id UUID DEFAULT NULL,
  _session_id UUID DEFAULT NULL,
  _feature TEXT DEFAULT NULL,
  _source TEXT DEFAULT 'dashboard',
  _metadata JSONB DEFAULT '{}'::jsonb,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row_count INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF _event_name NOT IN (
    'card_edit_started', 'profile_completed', 'feature_used',
    'pro_feature_view', 'pro_preview_started', 'pro_preview_interaction',
    'pro_preview_configured', 'pro_upgrade_clicked'
  ) THEN
    RAISE EXCEPTION 'Event requires a trusted server or database producer'
      USING ERRCODE = '42501';
  END IF;

  IF _source NOT IN ('dashboard', 'editor', 'pro_preview') THEN
    RAISE EXCEPTION 'Invalid client event source' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(COALESCE(_metadata, '{}'::jsonb)) item
    WHERE char_length(item.value) > 80
  )
    OR (_metadata->>'plan_tier' IS NOT NULL
      AND _metadata->>'plan_tier' NOT IN ('free', 'trialing', 'pro', 'enterprise'))
    OR (_metadata->>'previous_plan_tier' IS NOT NULL
      AND _metadata->>'previous_plan_tier' NOT IN ('free', 'trialing', 'pro', 'enterprise'))
    OR (_metadata->>'completion_state' IS NOT NULL
      AND _metadata->>'completion_state' NOT IN ('started', 'partial', 'complete'))
    OR (_metadata->>'card_state' IS NOT NULL
      AND _metadata->>'card_state' NOT IN ('draft', 'live', 'inactive'))
    OR (_metadata->>'interaction' IS NOT NULL
      AND _metadata->>'interaction' !~ '^[a-z][a-z0-9_]{1,63}$')
    OR (_metadata->>'cta' IS NOT NULL
      AND _metadata->>'cta' !~ '^[a-z][a-z0-9_]{1,63}$')
    OR (_metadata->>'entry_surface' IS NOT NULL
      AND _metadata->>'entry_surface' !~ '^[a-z][a-z0-9_]{1,63}$')
  THEN
    RAISE EXCEPTION 'Product event metadata is invalid' USING ERRCODE = '22023';
  END IF;

  IF _card_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.id = _card_id AND c.user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Card does not belong to the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.product_events (
    event_id, event_name, user_id, card_id, session_id, feature,
    source, metadata, release_identifier
  ) VALUES (
    _event_id, _event_name, _uid, _card_id, _session_id, _feature,
    _source, COALESCE(_metadata, '{}'::jsonb), _release_identifier
  )
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_product_event(UUID, TEXT, UUID, UUID, TEXT, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_product_event(UUID, TEXT, UUID, UUID, TEXT, TEXT, JSONB, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin-only operations/reporting projection
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_operations(
  _range_start TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  _range_end TIMESTAMPTZ DEFAULT now(),
  _search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _query TEXT := NULLIF(trim(COALESCE(_search, '')), '');
BEGIN
  PERFORM public.require_admin();

  IF _range_end <= _range_start OR _range_end - _range_start > interval '370 days' THEN
    RAISE EXCEPTION 'Invalid reporting range' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'overview', jsonb_build_object(
      'total_users', (SELECT count(*) FROM public.profiles WHERE user_id IS NOT NULL),
      'new_users', (SELECT count(*) FROM public.profiles
        WHERE user_id IS NOT NULL AND created_at >= _range_start AND created_at < _range_end),
      'activated_users', (SELECT count(DISTINCT user_id) FROM public.cards
        WHERE user_id IS NOT NULL AND is_active IS TRUE),
      'live_cards', (SELECT count(*) FROM public.cards WHERE is_active IS TRUE),
      'inactive_cards', (SELECT count(*) FROM public.cards WHERE is_active IS DISTINCT FROM TRUE),
      'connections', (SELECT count(*) FROM public.card_leads
        WHERE created_at >= _range_start AND created_at < _range_end),
      'trials_ending_soon', (SELECT count(*) FROM public.profiles
        WHERE plan_tier = 'trialing' AND trial_ends_at > now()
          AND trial_ends_at <= now() + interval '3 days'),
      'tier_distribution', (SELECT COALESCE(jsonb_object_agg(tier, amount), '{}'::jsonb)
        FROM (SELECT plan_tier AS tier, count(*) AS amount
          FROM public.profiles WHERE user_id IS NOT NULL GROUP BY plan_tier) tiers)
    ),
    'users', (SELECT COALESCE(jsonb_agg(to_jsonb(rows) ORDER BY rows.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT p.id, p.user_id, p.full_name, p.email, p.phone, p.created_at,
          p.plan_tier, p.trial_started_at, p.trial_ends_at,
          count(DISTINCT c.id)::int AS card_count,
          count(DISTINCT c.id) FILTER (WHERE c.is_active IS TRUE)::int AS live_card_count,
          count(DISTINCT c.id) FILTER (WHERE c.is_active IS DISTINCT FROM TRUE)::int AS inactive_card_count,
          count(DISTINCT l.id)::int AS connections_count,
          bool_or(c.is_active IS TRUE) AS activated
        FROM public.profiles p
        LEFT JOIN public.cards c ON c.user_id = p.user_id
        LEFT JOIN public.card_leads l ON l.card_id = c.id
        WHERE _query IS NULL
          OR p.full_name ILIKE '%' || _query || '%'
          OR p.email ILIKE '%' || _query || '%'
          OR p.user_id::text = _query
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 500
      ) rows),
    'cards', (SELECT COALESCE(jsonb_agg(to_jsonb(rows) ORDER BY rows.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT c.id, c.user_id, c.slug, c.full_name, c.created_at, c.updated_at,
          c.published_at, c.is_active, c.enable_arabic, c.plan_tier,
          p.full_name AS owner_name, p.email AS owner_email,
          count(DISTINCT l.id)::int AS connections_count,
          count(DISTINCT a.id) FILTER (WHERE a.event_type = 'page_view')::int AS views,
          count(DISTINCT a.id) FILTER (WHERE a.event_type = 'vcard_download')::int AS contact_saves,
          max(t.token) FILTER (WHERE t.status = 'active') AS active_nfc_token
        FROM public.cards c
        LEFT JOIN public.profiles p ON p.user_id = c.user_id
        LEFT JOIN public.card_leads l ON l.card_id = c.id
        LEFT JOIN public.card_analytics a ON a.card_id = c.id
        LEFT JOIN public.nfc_tags t ON t.card_id = c.id
        WHERE _query IS NULL
          OR c.full_name ILIKE '%' || _query || '%'
          OR c.slug ILIKE '%' || _query || '%'
          OR p.full_name ILIKE '%' || _query || '%'
          OR p.email ILIKE '%' || _query || '%'
        GROUP BY c.id, p.full_name, p.email
        ORDER BY c.created_at DESC
        LIMIT 500
      ) rows),
    'product_analytics', jsonb_build_object(
      'collection_started', (SELECT min(created_at) FROM public.product_events),
      'events', (SELECT COALESCE(jsonb_object_agg(event_name, amount), '{}'::jsonb)
        FROM (SELECT event_name, count(*) AS amount FROM public.product_events
          WHERE created_at >= _range_start AND created_at < _range_end GROUP BY event_name) counts),
      'dau', (SELECT count(DISTINCT user_id) FROM public.product_events
        WHERE user_id IS NOT NULL AND created_at >= date_trunc('day', now())),
      'wau', (SELECT count(DISTINCT user_id) FROM public.product_events
        WHERE user_id IS NOT NULL AND created_at >= now() - interval '7 days'),
      'mau', (SELECT count(DISTINCT user_id) FROM public.product_events
        WHERE user_id IS NOT NULL AND created_at >= now() - interval '30 days'),
      'recent', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]'::jsonb)
        FROM (SELECT id, event_name, user_id, card_id, feature, source, created_at
          FROM public.product_events ORDER BY created_at DESC LIMIT 100) e)
    ),
    'audit', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
      FROM (SELECT id, actor_user_id, action, target_type, target_id, result,
          change_summary, environment, release_identifier, created_at
        FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 250) a)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_operations(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_operations(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  PERFORM public.require_admin();

  SELECT jsonb_build_object(
    'profile', to_jsonb(p),
    'cards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'full_name', c.full_name,
      'created_at', c.created_at, 'updated_at', c.updated_at,
      'published_at', c.published_at, 'is_active', c.is_active,
      'enable_arabic', c.enable_arabic, 'plan_tier', c.plan_tier
    ) ORDER BY c.created_at DESC), '[]'::jsonb) FROM public.cards c WHERE c.user_id = _user_id),
    'connections_count', (SELECT count(*) FROM public.card_leads l
      JOIN public.cards c ON c.id = l.card_id WHERE c.user_id = _user_id),
    'product_activity', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'event_name', e.event_name, 'feature', e.feature, 'source', e.source,
      'created_at', e.created_at
    ) ORDER BY e.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.product_events WHERE user_id = _user_id
        ORDER BY created_at DESC LIMIT 100) e),
    'audit', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
      FROM (SELECT id, actor_user_id, action, target_type, target_id, result,
          change_summary, created_at FROM public.admin_audit_log
        WHERE target_id = _user_id::text ORDER BY created_at DESC LIMIT 100) a)
  ) INTO _result
  FROM (
    SELECT id, user_id, full_name, email, phone, created_at, plan_tier,
      trial_started_at, trial_ends_at, trial_used
    FROM public.profiles WHERE user_id = _user_id
  ) p;

  IF _result IS NULL THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Narrow, confirmed and audited admin mutations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_profile(
  _full_name TEXT,
  _email TEXT,
  _phone TEXT DEFAULT NULL,
  _plan_tier TEXT DEFAULT 'free',
  _release_identifier TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  PERFORM public.require_admin();
  IF trim(COALESCE(_full_name, '')) = '' OR char_length(trim(_full_name)) > 120 THEN
    RAISE EXCEPTION 'Invalid full name' USING ERRCODE = '22023';
  END IF;
  IF _email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR char_length(_email) > 254 THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  IF _plan_tier NOT IN ('free', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid entitlement' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (full_name, email, phone, plan_tier)
  VALUES (trim(_full_name), lower(trim(_email)), NULLIF(trim(_phone), ''), _plan_tier)
  RETURNING id INTO _id;

  PERFORM public.append_admin_audit(
    'profile_created', 'profile', _id::text, 'success',
    jsonb_build_object('plan_tier', _plan_tier), _release_identifier
  );
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_card(
  _user_id UUID,
  _slug TEXT,
  _full_name TEXT,
  _phone TEXT,
  _is_active BOOLEAN DEFAULT FALSE,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _tier TEXT;
BEGIN
  PERFORM public.require_admin();
  IF _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'A registered profile owner is required' USING ERRCODE = '22023';
  END IF;
  IF _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(_slug) NOT BETWEEN 2 AND 48 THEN
    RAISE EXCEPTION 'Invalid slug' USING ERRCODE = '22023';
  END IF;
  IF trim(COALESCE(_full_name, '')) = '' OR char_length(trim(_full_name)) > 120 THEN
    RAISE EXCEPTION 'Invalid card name' USING ERRCODE = '22023';
  END IF;

  SELECT plan_tier INTO _tier FROM public.profiles WHERE user_id = _user_id;
  INSERT INTO public.cards (user_id, slug, full_name, phone, plan_tier, is_active)
  VALUES (_user_id, _slug, trim(_full_name), COALESCE(NULLIF(trim(_phone), ''), '-'), _tier, _is_active)
  RETURNING id INTO _id;

  PERFORM public.append_admin_audit(
    'card_created', 'card', _id::text, 'success',
    jsonb_build_object('owner_user_id', _user_id, 'is_active', _is_active), _release_identifier
  );
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_card(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_card(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_entitlement(
  _user_id UUID,
  _plan_tier TEXT,
  _reason TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _previous TEXT;
BEGIN
  PERFORM public.require_admin();
  IF _plan_tier NOT IN ('free', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid entitlement' USING ERRCODE = '22023';
  END IF;
  IF trim(COALESCE(_reason, '')) = '' OR char_length(trim(_reason)) > 160 THEN
    RAISE EXCEPTION 'A short support reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT plan_tier INTO _previous FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.profiles SET plan_tier = _plan_tier WHERE user_id = _user_id;
  PERFORM public.append_admin_audit(
    'entitlement_changed', 'user', _user_id::text, 'success',
    jsonb_build_object('previous_plan_tier', _previous, 'plan_tier', _plan_tier, 'reason', trim(_reason)),
    _release_identifier
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_entitlement(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_entitlement(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_card_active(
  _card_id UUID,
  _is_active BOOLEAN,
  _reason TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner UUID;
  _previous BOOLEAN;
BEGIN
  PERFORM public.require_admin();
  IF trim(COALESCE(_reason, '')) = '' OR char_length(trim(_reason)) > 160 THEN
    RAISE EXCEPTION 'A short support reason is required' USING ERRCODE = '22023';
  END IF;
  SELECT user_id, is_active INTO _owner, _previous
    FROM public.cards WHERE id = _card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.cards SET is_active = _is_active WHERE id = _card_id;
  PERFORM public.append_admin_audit(
    CASE WHEN _is_active THEN 'card_activated' ELSE 'card_deactivated' END,
    'card', _card_id::text, 'success',
    jsonb_build_object('previous_active', _previous, 'is_active', _is_active, 'reason', trim(_reason)),
    _release_identifier
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_card_active(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_card_active(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_card(
  _card_id UUID,
  _confirmation_slug TEXT,
  _reason TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug TEXT;
BEGIN
  PERFORM public.require_admin();
  SELECT slug INTO _slug FROM public.cards WHERE id = _card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;
  IF _confirmation_slug IS DISTINCT FROM _slug THEN
    RAISE EXCEPTION 'Card confirmation did not match' USING ERRCODE = '22023';
  END IF;
  IF trim(COALESCE(_reason, '')) = '' OR char_length(trim(_reason)) > 160 THEN
    RAISE EXCEPTION 'A short deletion reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM public.append_admin_audit(
    'card_deleted', 'card', _card_id::text, 'success',
    jsonb_build_object('slug', _slug, 'reason', trim(_reason)), _release_identifier
  );
  DELETE FROM public.cards WHERE id = _card_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_card(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_card(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_profile(
  _profile_id UUID,
  _confirmation_email TEXT,
  _reason TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _user_id UUID;
BEGIN
  PERFORM public.require_admin();
  SELECT email, user_id INTO _email, _user_id
    FROM public.profiles WHERE id = _profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002'; END IF;
  IF lower(trim(_confirmation_email)) IS DISTINCT FROM lower(_email) THEN
    RAISE EXCEPTION 'Profile confirmation did not match' USING ERRCODE = '22023';
  END IF;
  IF trim(COALESCE(_reason, '')) = '' OR char_length(trim(_reason)) > 160 THEN
    RAISE EXCEPTION 'A short deletion reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM public.append_admin_audit(
    'profile_deleted', 'profile', _profile_id::text, 'success',
    jsonb_build_object('user_id', _user_id, 'reason', trim(_reason)), _release_identifier
  );
  DELETE FROM public.profiles WHERE id = _profile_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_profile(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Existing NFC behavior is retained behind atomic audited wrappers. The wrappers
-- call the existing role-checked RPCs and append the audit row in one transaction.

CREATE OR REPLACE FUNCTION public.admin_provision_nfc_tag_audited(
  _card_id UUID DEFAULT NULL,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _id UUID;
  _token TEXT;
  _result_card_id UUID;
  _status TEXT;
  _created_at TIMESTAMPTZ;
  _assigned_at TIMESTAMPTZ;
BEGIN
  PERFORM public.require_admin();
  SELECT p.id, p.token, p.card_id, p.status, p.created_at, p.assigned_at
    INTO _id, _token, _result_card_id, _status, _created_at, _assigned_at
    FROM public.admin_provision_nfc_tag(_card_id) p;
  PERFORM public.append_admin_audit(
    'nfc_provisioned', 'nfc_tag', _id::text, 'success',
    jsonb_strip_nulls(jsonb_build_object('card_id', _result_card_id, 'status', _status)),
    _release_identifier
  );
  RETURN jsonb_build_object(
    'id', _id, 'token', _token, 'card_id', _result_card_id,
    'status', _status, 'created_at', _created_at, 'assigned_at', _assigned_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_nfc_tag_audited(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_nfc_tag_audited(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_nfc_tag_audited(
  _token TEXT,
  _card_id UUID,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tag_id UUID;
  _previous_card_id UUID;
BEGIN
  PERFORM public.require_admin();
  SELECT id, card_id INTO _tag_id, _previous_card_id
    FROM public.nfc_tags WHERE token = _token;
  PERFORM public.admin_assign_nfc_tag(_token, _card_id);
  PERFORM public.append_admin_audit(
    CASE WHEN _previous_card_id IS NULL THEN 'nfc_assigned' ELSE 'nfc_reassigned' END,
    'nfc_tag', _tag_id::text, 'success',
    jsonb_strip_nulls(jsonb_build_object(
      'previous_card_id', _previous_card_id, 'card_id', _card_id
    )),
    _release_identifier
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_nfc_tag_audited(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_nfc_tag_audited(TEXT, UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_tag_status_audited(
  _token TEXT,
  _status TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tag_id UUID;
  _previous_status TEXT;
BEGIN
  PERFORM public.require_admin();
  SELECT id, status INTO _tag_id, _previous_status
    FROM public.nfc_tags WHERE token = _token;
  PERFORM public.admin_update_tag_status(_token, _status);
  PERFORM public.append_admin_audit(
    'nfc_status_changed', 'nfc_tag', _tag_id::text, 'success',
    jsonb_build_object('previous_status', _previous_status, 'status', _status),
    _release_identifier
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_tag_status_audited(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_tag_status_audited(TEXT, TEXT, TEXT)
  TO authenticated;

COMMENT ON TABLE public.product_events IS
  'Internal JustTap product activity only; separate from customer-facing card_analytics. Forward collection begins with testing Phase 2.';
COMMENT ON TABLE public.admin_audit_log IS
  'Append-only record of privileged JustTap administrative operations. No retention deletion policy is approved yet.';
