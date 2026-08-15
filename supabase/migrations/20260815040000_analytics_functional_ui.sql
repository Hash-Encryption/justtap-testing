-- Connections + Analytics Upgrade Phase 05: entitled owner analytics aggregates.

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
      AND profile.plan_tier IN ('pro', 'enterprise')
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

  WITH scoped_events AS MATERIALIZED (
    SELECT event_type, created_at, entry_source
    FROM public.card_analytics
    WHERE card_id = _card_id
      AND (
        _metric_start_utc IS NULL
        OR (
          created_at >= _metric_start_utc AT TIME ZONE 'UTC'
          AND created_at < (_today_utc + interval '1 day') AT TIME ZONE 'UTC'
        )
      )
  ),
  totals AS (
    SELECT
      count(*) FILTER (WHERE event_type = 'page_view') AS profile_views,
      count(*) FILTER (WHERE event_type = 'vcard_download') AS contact_saves,
      count(*) FILTER (WHERE event_type = 'connection_submit') AS connections
    FROM scoped_events
  ),
  action_totals AS (
    SELECT action, count(*) AS total, sort_order
    FROM scoped_events
    CROSS JOIN LATERAL (
      VALUES
        ('vcard_download', 1),
        ('connection_submit', 2)
    ) AS action_map(action, sort_order)
    WHERE event_type = action
    GROUP BY action, sort_order
  ),
  source_totals AS (
    SELECT entry_source AS source, count(*) AS total
    FROM scoped_events
    WHERE event_type = 'page_view'
      AND entry_source IN ('direct', 'profile_qr', 'permanent_tag')
    GROUP BY entry_source
  ),
  trend_events AS (
    SELECT
      CASE _trend_granularity
        WHEN 'month' THEN date_trunc('month', created_at AT TIME ZONE 'UTC')
        ELSE date_trunc('day', created_at AT TIME ZONE 'UTC')
      END AS period,
      count(*) FILTER (WHERE event_type = 'page_view') AS profile_views,
      count(*) FILTER (WHERE event_type = 'vcard_download') AS contact_saves,
      count(*) FILTER (WHERE event_type = 'connection_submit') AS connections
    FROM public.card_analytics
    WHERE card_id = _card_id
      AND created_at >= _trend_start_utc AT TIME ZONE 'UTC'
      AND created_at < _trend_end_utc AT TIME ZONE 'UTC'
    GROUP BY 1
  ),
  trend_periods AS (
    SELECT generate_series(
      _trend_start_utc,
      _trend_end_utc - CASE _trend_granularity
        WHEN 'month' THEN interval '1 month'
        ELSE interval '1 day'
      END,
      CASE _trend_granularity
        WHEN 'month' THEN interval '1 month'
        ELSE interval '1 day'
      END
    ) AS period
  )
  SELECT jsonb_build_object(
    'range', _range,
    'trend_granularity', _trend_granularity,
    'trend_label', _trend_label,
    'metrics', jsonb_build_object(
      'profile_views', totals.profile_views,
      'contact_saves', totals.contact_saves,
      'connections', totals.connections,
      'conversion_rate', coalesce(
        round(totals.connections::numeric / nullif(totals.profile_views, 0) * 100, 1),
        0
      )
    ),
    'trend', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'period', to_char(periods.period, CASE _trend_granularity WHEN 'month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END),
          'profile_views', coalesce(events.profile_views, 0),
          'contact_saves', coalesce(events.contact_saves, 0),
          'connections', coalesce(events.connections, 0)
        )
        ORDER BY periods.period
      )
      FROM trend_periods AS periods
      LEFT JOIN trend_events AS events ON events.period = periods.period
    ),
    'top_actions', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object('action', action, 'count', total)
        ORDER BY total DESC, sort_order
      )
      FROM action_totals
      WHERE total > 0
    ), '[]'::jsonb),
    'traffic_sources', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object('source', source, 'count', total)
        ORDER BY CASE source WHEN 'direct' THEN 1 WHEN 'profile_qr' THEN 2 ELSE 3 END
      )
      FROM source_totals
      WHERE total > 0
    ), '[]'::jsonb)
  )
  INTO _result
  FROM totals;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_card_analytics(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.get_owner_card_analytics(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_card_analytics(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "owners read their analytics" ON public.card_analytics;
DROP POLICY IF EXISTS "pro owners and admins read analytics" ON public.card_analytics;
CREATE POLICY "pro owners and admins read analytics"
  ON public.card_analytics
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.cards AS card
      JOIN public.profiles AS profile ON profile.user_id = card.user_id
      WHERE card.id = card_analytics.card_id
        AND card.user_id = auth.uid()
        AND profile.plan_tier IN ('pro', 'enterprise')
    )
  );
