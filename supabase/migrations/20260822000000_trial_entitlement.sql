-- Trial entitlement: add trialing plan_tier, trial timestamp columns, one-use
-- enforcement, and server-time-enforced expiry in all public-facing RPCs.
--
-- Apply through the Supabase migration runner; never paste partial statements.

-- ── 1. Trial columns on profiles ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_used        BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Allow 'trialing' in plan_tier on both tables ──────────────────────────

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_tier_values;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_tier_values
  CHECK (plan_tier IN ('free', 'trialing', 'pro', 'enterprise'));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_plan_tier_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_plan_tier_values
  CHECK (plan_tier IN ('free', 'trialing', 'pro', 'enterprise'));

-- ── 3. Update design-engine trigger to allow active trialing users ────────────
--      Replaces the Phase 06 version.

CREATE OR REPLACE FUNCTION public.cards_enforce_pro_design_features()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _trial_ends TIMESTAMPTZ;
BEGIN
  IF auth.role() = 'authenticated' AND NEW.design_mode = 'custom' THEN
    IF NEW.plan_tier IN ('pro', 'enterprise') THEN
      -- Full Pro/enterprise: always allowed.
      NULL;
    ELSIF NEW.plan_tier = 'trialing' THEN
      -- Trialing: allowed only while trial has not expired (server time).
      SELECT p.trial_ends_at INTO _trial_ends
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
      LIMIT 1;

      IF _trial_ends IS NULL OR _trial_ends <= now() THEN
        RAISE EXCEPTION 'Pro trial has expired — Custom Creator requires an active Pro subscription'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      -- Free or unknown: blocked.
      RAISE EXCEPTION 'Custom Creator design engine requires a Pro subscription or active trial'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_enforce_pro_design_features_trigger ON public.cards;
CREATE TRIGGER cards_enforce_pro_design_features_trigger
  BEFORE INSERT OR UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.cards_enforce_pro_design_features();

-- ── 4. start_pro_trial() — trusted RPC, one use per account ──────────────────
--
-- SECURITY DEFINER runs as the function owner (postgres role), bypassing the
-- authenticated-role trigger guards on plan_tier — same pattern as every admin
-- RPC in this project.  Business-logic guards (trial_used, existing tier) are
-- enforced inside the function body.

CREATE OR REPLACE FUNCTION public.start_pro_trial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid          UUID;
  _current_tier TEXT;
  _trial_used   BOOLEAN;
  _ends_at      TIMESTAMPTZ;
BEGIN
  _uid := auth.uid();

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT plan_tier, trial_used
  INTO   _current_tier, _trial_used
  FROM   public.profiles
  WHERE  user_id = _uid
  FOR UPDATE;  -- serializes concurrent trial-start requests for this account

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- One trial per account, ever.
  IF _trial_used THEN
    RAISE EXCEPTION 'Trial already used — each account may start one free trial'
      USING ERRCODE = '42501';
  END IF;

  -- Already on a paid or trialing plan.
  IF _current_tier IN ('trialing', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Account is already on an active plan'
      USING ERRCODE = '42501';
  END IF;

  _ends_at := now() + INTERVAL '7 days';

  UPDATE public.profiles
  SET    plan_tier        = 'trialing',
         trial_started_at = now(),
         trial_ends_at    = _ends_at,
         trial_used       = true
  WHERE  user_id = _uid;

  -- sync_profile_plan_to_cards trigger fires automatically on plan_tier change,
  -- propagating 'trialing' to all of the user's cards.

  RETURN jsonb_build_object(
    'ok',            true,
    'trial_ends_at', to_char(_ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_pro_trial() FROM public;
GRANT EXECUTE ON FUNCTION public.start_pro_trial() TO authenticated;

-- ── 5. Rebuild get_public_card_by_slug with server-time expiry ────────────────
--
-- Effective Pro entitlement: pro | enterprise | (trialing AND trial_ends_at > now())
-- An expired trialing card is treated as Free at query time — no background job needed.

DROP FUNCTION IF EXISTS public.get_public_card_by_slug(text);

CREATE FUNCTION public.get_public_card_by_slug(_slug TEXT)
RETURNS TABLE (
  id                    UUID,
  slug                  TEXT,
  full_name             TEXT,
  phone                 TEXT,
  email                 TEXT,
  title                 TEXT,
  company               TEXT,
  bio                   TEXT,
  avatar_url            TEXT,
  logo_url              TEXT,
  show_logo_badge       BOOLEAN,
  header_pattern        TEXT,
  accent_color          TEXT,
  bg_color              TEXT,
  design_mode           TEXT,
  surface_color         TEXT,
  champagne_accent      TEXT,
  text_color            TEXT,
  surface_finish        TEXT,
  border_radius         TEXT,
  font_family           TEXT,
  whatsapp_phone        TEXT,
  whatsapp_message      TEXT,
  enable_arabic         BOOLEAN,
  full_name_ar          TEXT,
  title_ar              TEXT,
  bio_ar                TEXT,
  social_links          JSONB,
  public_features       JSONB,
  public_features_enabled BOOLEAN,
  show_branding         BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id,
    c.slug,
    c.full_name,
    c.phone,
    c.email,
    c.title,
    c.company,
    c.bio,
    c.avatar_url,
    c.logo_url,
    c.show_logo_badge,

    -- Design fields: exposed only for effectively-Pro cards.
    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.header_pattern ELSE 'wave' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.accent_color ELSE '#6B21A8' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.bg_color ELSE '#08080A' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN 'custom' ELSE 'classic_v2' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.surface_color ELSE '#121216' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.champagne_accent ELSE '#E6D5AC' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.text_color ELSE '#FAFAFA' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.surface_finish ELSE 'matte' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.border_radius ELSE 'minimal' END,

    CASE WHEN c.design_mode = 'custom'
          AND (
            c.plan_tier IN ('pro', 'enterprise')
            OR (c.plan_tier = 'trialing'
                AND EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.user_id = c.user_id
                    AND p.trial_ends_at IS NOT NULL
                    AND p.trial_ends_at > now()
                ))
          )
      THEN c.font_family ELSE 'Outfit' END,

    c.whatsapp_phone,
    c.whatsapp_message,
    c.enable_arabic,
    c.full_name_ar,
    c.title_ar,
    c.bio_ar,
    c.social_links,

    -- Pro features block
    CASE WHEN (
      c.plan_tier IN ('pro', 'enterprise')
      OR (c.plan_tier = 'trialing'
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = c.user_id
              AND p.trial_ends_at IS NOT NULL
              AND p.trial_ends_at > now()
          ))
    ) THEN jsonb_build_object(
      'video_url',        c.pro_features->'video_url',
      'pdf_url',          c.pro_features->'pdf_url',
      'pdf_label',        c.pro_features->'pdf_label',
      'booking_url',      c.pro_features->'booking_url',
      'custom_cta_label', c.pro_features->'custom_cta_label',
      'custom_cta_url',   c.pro_features->'custom_cta_url'
    ) ELSE NULL END,

    -- public_features_enabled flag
    (
      c.plan_tier IN ('pro', 'enterprise')
      OR (c.plan_tier = 'trialing'
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = c.user_id
              AND p.trial_ends_at IS NOT NULL
              AND p.trial_ends_at > now()
          ))
    ),

    -- show_branding: false only when Pro-entitled AND remove_branding = true
    NOT (
      (
        c.plan_tier IN ('pro', 'enterprise')
        OR (c.plan_tier = 'trialing'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.user_id = c.user_id
                AND p.trial_ends_at IS NOT NULL
                AND p.trial_ends_at > now()
            ))
      )
      AND COALESCE((c.pro_features->>'remove_branding')::BOOLEAN, false)
    )

  FROM public.cards c
  WHERE c.slug = _slug
    AND c.is_active IS true
    AND _slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND char_length(_slug) BETWEEN 2 AND 48;
$$;

REVOKE ALL ON FUNCTION public.get_public_card_by_slug(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_card_by_slug(TEXT) TO anon, authenticated;

-- ── 6. Index trial_ends_at for efficient expiry checks ────────────────────────

CREATE INDEX IF NOT EXISTS profiles_trial_ends_at_idx ON public.profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
