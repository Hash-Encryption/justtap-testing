-- Reconcile Connections & Analytics with Server-Controlled 7-Day Pro Trial Entitlement.
--
-- Preserves all existing historical migrations byte-for-byte.
-- Additively updates RLS policies and RPCs to recognize active trialing accounts
-- (plan_tier = 'trialing' AND trial_ends_at > now()) alongside Pro and Enterprise.

-- ── 1. Connections Update Policy: Allow Active Trialing Users ────────────────

DROP POLICY IF EXISTS "Owners manage connection follow up and tags" ON public.card_leads;
CREATE POLICY "Owners manage connection follow up and tags"
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
          AND (
            profile.plan_tier IN ('pro', 'enterprise')
            OR (
              profile.plan_tier = 'trialing'
              AND profile.trial_ends_at IS NOT NULL
              AND profile.trial_ends_at > now()
            )
          )
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
          AND (
            profile.plan_tier IN ('pro', 'enterprise')
            OR (
              profile.plan_tier = 'trialing'
              AND profile.trial_ends_at IS NOT NULL
              AND profile.trial_ends_at > now()
            )
          )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── 2. Analytics Aggregation RPC: Allow Active Trialing Users ────────────────

CREATE OR REPLACE FUNCTION public.get_owner_card_analytics(
  _card_id uuid,
  _range text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _owner_id uuid := auth.uid();
  _today_utc timestamp without time zone := date_trunc('day', now() AT TIME ZONE 'UTC');
  _metric_start_utc timestamp without time zone;
  _trend_start_utc timestamp without time zone;
  _trend_end_utc timestamp without time zone;
  _trend_granularity text;
  _trend_label text;
  _result jsonb;
BEGIN
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Analytics unavailable' USING errcode = '42501';
  END IF;

  IF _range IS NULL OR _range NOT IN ('7d', '30d', '90d', 'all') THEN
    RAISE EXCEPTION 'Invalid analytics range' USING errcode = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cards AS card
    JOIN public.profiles AS profile ON profile.user_id = card.user_id
    WHERE card.id = _card_id
      AND card.user_id = _owner_id
      AND (
        profile.plan_tier IN ('pro', 'enterprise')
        OR (
          profile.plan_tier = 'trialing'
          AND profile.trial_ends_at IS NOT NULL
          AND profile.trial_ends_at > now()
        )
      )
  ) THEN
    RAISE EXCEPTION 'Analytics unavailable' USING errcode = '42501';
  END IF;

  IF _range = 'all' THEN
    _metric_start_utc := NULL;
    _trend_start_utc := date_trunc('month', _today_utc) - interval '11 months';
    _trend_end_utc := date_trunc('month', _today_utc) + interval '1 month';
    _trend_granularity := 'month';
    _trend_label := 'Latest 12 calendar months (all-time totals above)';
  ELSE
    _metric_start_utc := _today_utc - CASE _range
      WHEN '7d' THEN interval '6 days'
      WHEN '30d' THEN interval '29 days'
      ELSE interval '89 days'
    END;
    _trend_start_utc := _metric_start_utc;
    _trend_end_utc := _today_utc + interval '1 day';
    _trend_granularity := 'day';
    _trend_label := CASE _range
      WHEN '7d' THEN 'Daily activity for the last 7 UTC days'
      WHEN '30d' THEN 'Daily activity for the last 30 UTC days'
      ELSE 'Daily activity for the last 90 UTC days'
    END;
  END IF;

  WITH activity_in_scope AS (
    SELECT
      analytics.id,
      analytics.event_type,
      analytics.entry_source,
      analytics.created_at AT TIME ZONE 'UTC' AS created_at_utc
    FROM public.card_analytics AS analytics
    WHERE analytics.card_id = _card_id
  ),
  metric_counts AS (
    SELECT
      count(*) FILTER (WHERE event_type = 'page_view') AS profile_views,
      count(*) FILTER (WHERE event_type = 'vcard_download') AS contact_saves,
      count(*) FILTER (WHERE event_type = 'connection_submit') AS connections
    FROM activity_in_scope
    WHERE _metric_start_utc IS NULL OR created_at_utc >= _metric_start_utc
  ),
  top_action_counts AS (
    SELECT
      event_type AS action,
      count(*) AS count
    FROM activity_in_scope
    WHERE (_metric_start_utc IS NULL OR created_at_utc >= _metric_start_utc)
      AND event_type <> 'page_view'
    GROUP BY event_type
  ),
  traffic_source_counts AS (
    SELECT
      entry_source AS source,
      count(*) AS count
    FROM activity_in_scope
    WHERE (_metric_start_utc IS NULL OR created_at_utc >= _metric_start_utc)
      AND event_type = 'page_view'
      AND entry_source IS NOT NULL
    GROUP BY entry_source
  ),
  trend_periods AS (
    SELECT generate_series(
      _trend_start_utc,
      _trend_end_utc - CASE WHEN _trend_granularity = 'day' THEN interval '1 day' ELSE interval '1 month' END,
      CASE WHEN _trend_granularity = 'day' THEN interval '1 day' ELSE interval '1 month' END
    ) AS period_start
  ),
  trend_aggregates AS (
    SELECT
      CASE
        WHEN _trend_granularity = 'day' THEN to_char(trend_periods.period_start, 'YYYY-MM-DD')
        ELSE to_char(trend_periods.period_start, 'YYYY-MM')
      END AS period,
      count(activity_in_scope.id) FILTER (WHERE activity_in_scope.event_type = 'page_view') AS profile_views,
      count(activity_in_scope.id) FILTER (WHERE activity_in_scope.event_type = 'vcard_download') AS contact_saves,
      count(activity_in_scope.id) FILTER (WHERE activity_in_scope.event_type = 'connection_submit') AS connections
    FROM trend_periods
    LEFT JOIN activity_in_scope
      ON date_trunc(_trend_granularity, activity_in_scope.created_at_utc) = trend_periods.period_start
    GROUP BY trend_periods.period_start
    ORDER BY trend_periods.period_start ASC
  )
  SELECT jsonb_build_object(
    'range', _range,
    'trend_granularity', _trend_granularity,
    'trend_label', _trend_label,
    'metrics', (
      SELECT jsonb_build_object(
        'profile_views', metric_counts.profile_views,
        'contact_saves', metric_counts.contact_saves,
        'connections', metric_counts.connections,
        'conversion_rate', CASE
          WHEN metric_counts.profile_views = 0 THEN 0
          ELSE round((metric_counts.connections::numeric / metric_counts.profile_views::numeric) * 100, 1)
        END
      )
      FROM metric_counts
    ),
    'trend', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'period', trend_aggregates.period,
          'profile_views', trend_aggregates.profile_views,
          'contact_saves', trend_aggregates.contact_saves,
          'connections', trend_aggregates.connections
        )
      )
      FROM trend_aggregates
    ), '[]'::jsonb),
    'top_actions', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', top_action_counts.action,
          'count', top_action_counts.count
        )
        ORDER BY top_action_counts.count DESC, top_action_counts.action ASC
      )
      FROM top_action_counts
    ), '[]'::jsonb),
    'traffic_sources', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'source', traffic_source_counts.source,
          'count', traffic_source_counts.count
        )
        ORDER BY traffic_source_counts.count DESC, traffic_source_counts.source ASC
      )
      FROM traffic_source_counts
    ), '[]'::jsonb)
  )
  INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_card_analytics(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_owner_card_analytics(uuid, text) TO authenticated, service_role;
