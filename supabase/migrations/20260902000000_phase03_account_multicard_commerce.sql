-- ============================================================================
-- JUSTTAP PHASE 3: PRODUCTION-READY DATABASE MIGRATION
-- Customer Account Center, Multi-Card Portfolio & Physical Card Commerce Foundation
-- Target Project: nlumgigqlaymjiwgpvtp
-- ============================================================================

-- 1. Profiles Table Extension: Account Avatar
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Cards Table Extensions: Card Display Name & Primary Card
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_name TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Backfill: Assign is_primary = true to the earliest created card for each user
WITH first_cards AS (
  SELECT DISTINCT ON (user_id) id
  FROM public.cards
  ORDER BY user_id, created_at ASC
)
UPDATE public.cards
SET is_primary = true
WHERE id IN (SELECT id FROM first_cards);

-- Partial Unique Index: Exactly at most one primary card per user
CREATE UNIQUE INDEX IF NOT EXISTS cards_one_primary_per_user_idx
  ON public.cards (user_id)
  WHERE is_primary IS TRUE;

-- Trigger: Concurrency-safe primary card synchronization on INSERT / UPDATE
CREATE OR REPLACE FUNCTION public.handle_card_primary_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary IS TRUE THEN
    UPDATE public.cards
    SET is_primary = false
    WHERE user_id = NEW.user_id AND id <> NEW.id AND is_primary IS TRUE;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.cards WHERE user_id = NEW.user_id AND id <> NEW.id AND is_primary IS TRUE
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_primary_sync_trigger ON public.cards;
CREATE TRIGGER cards_primary_sync_trigger
  BEFORE INSERT OR UPDATE OF is_primary ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_card_primary_sync();

-- Trigger: Deterministic Primary Card promotion upon card deletion
CREATE OR REPLACE FUNCTION public.handle_card_primary_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _replacement_id UUID;
BEGIN
  -- Only execute promotion when the deleted card was the primary card
  IF OLD.is_primary IS TRUE THEN
    -- Find the earliest created remaining card for this user
    SELECT id INTO _replacement_id
    FROM public.cards
    WHERE user_id = OLD.user_id AND id <> OLD.id
    ORDER BY created_at ASC
    LIMIT 1;

    IF _replacement_id IS NOT NULL THEN
      UPDATE public.cards
      SET is_primary = true
      WHERE id = _replacement_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cards_primary_on_delete_trigger ON public.cards;
CREATE TRIGGER cards_primary_on_delete_trigger
  AFTER DELETE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_card_primary_on_delete();

-- 3. Concurrency-Safe Database-Enforced Card Creation Tier Limits
CREATE OR REPLACE FUNCTION public.enforce_card_creation_tier_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _tier TEXT;
  _trial_ends TIMESTAMPTZ;
  _current_count INTEGER;
  _max_allowed INTEGER;
BEGIN
  IF auth.role() = 'authenticated' THEN
    -- Serialize concurrent card creation attempts for this user
    PERFORM 1 FROM public.profiles WHERE user_id = NEW.user_id FOR UPDATE;

    SELECT plan_tier, trial_ends_at
    INTO _tier, _trial_ends
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    -- Evaluate effective tier at server time
    IF _tier = 'trialing' AND (_trial_ends IS NULL OR _trial_ends <= now()) THEN
      _tier := 'free';
    END IF;

    _max_allowed := CASE
      WHEN _tier = 'enterprise' THEN 5
      WHEN _tier IN ('pro', 'trialing') THEN 3
      ELSE 1
    END;

    SELECT count(*) INTO _current_count
    FROM public.cards
    WHERE user_id = NEW.user_id;

    IF _current_count >= _max_allowed THEN
      RAISE EXCEPTION 'Card creation limit reached for tier % (limit: %)', COALESCE(_tier, 'free'), _max_allowed
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_enforce_creation_limits_trigger ON public.cards;
CREATE TRIGGER cards_enforce_creation_limits_trigger
  BEFORE INSERT ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_card_creation_tier_limits();

-- 4. Centralized Physical Card Products Configuration Table
CREATE TABLE IF NOT EXISTS public.physical_card_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  variant TEXT NOT NULL,
  variant_ar TEXT NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.physical_card_products (id, name, name_ar, variant, variant_ar, sku, price, currency)
VALUES (
  'pvc_matte_black',
  'JustTap Matte Card',
  'بطاقة JustTap الذكية (مطفي)',
  'Matte Black PVC',
  'أسود مطفي',
  'JT-NFC-PVC-BLK',
  119.00,
  'SAR'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  variant = EXCLUDED.variant,
  variant_ar = EXCLUDED.variant_ar,
  sku = EXCLUDED.sku,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency;

ALTER TABLE public.physical_card_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.physical_card_products FOR SELECT USING (is_active IS TRUE);
GRANT SELECT ON public.physical_card_products TO authenticated, anon;

-- 5. Order Number Sequence (Starting at JT-001001)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- 6. Physical Card Orders Table
CREATE TABLE IF NOT EXISTS public.card_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  
  -- Customer & Card Snapshots
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  card_name_snapshot TEXT NOT NULL,
  card_slug_snapshot TEXT NOT NULL,
  digital_card_token_snapshot TEXT NOT NULL,
  
  -- Product Details
  product_id TEXT REFERENCES public.physical_card_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_variant TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  
  -- Shipping Destination
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  delivery_instructions TEXT,
  
  -- Financial Breakdown (SAR)
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  
  -- Orthogonal Statuses
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'new'
    CHECK (fulfillment_status IN ('new', 'preparing', 'ready', 'shipped', 'completed', 'cancelled')),
  
  -- Payment-Ready Nullable Fields
  payment_provider TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  refund_reference TEXT,
  refunded_at TIMESTAMPTZ,
  
  -- Linked Physical NFC Tag (1-to-1 unique guarantee for orders)
  nfc_tag_id UUID REFERENCES public.nfc_tags(id) ON DELETE SET NULL,
  nfc_token_snapshot TEXT,
  
  -- Logistics & Admin Notes
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS card_orders_user_idx ON public.card_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_orders_card_idx ON public.card_orders (card_id);
CREATE INDEX IF NOT EXISTS card_orders_order_number_idx ON public.card_orders (order_number);
CREATE INDEX IF NOT EXISTS card_orders_fulfillment_idx ON public.card_orders (fulfillment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS card_orders_payment_idx ON public.card_orders (payment_status, created_at DESC);

-- Unique index guaranteeing a physical NFC tag is never attached to multiple orders
CREATE UNIQUE INDEX IF NOT EXISTS card_orders_unique_nfc_tag_idx
  ON public.card_orders (nfc_tag_id)
  WHERE nfc_tag_id IS NOT NULL;

-- Enable RLS on Orders
ALTER TABLE public.card_orders ENABLE ROW LEVEL SECURITY;

-- Revoke direct INSERT/UPDATE/DELETE from client roles
REVOKE INSERT, UPDATE, DELETE ON public.card_orders FROM authenticated, anon, PUBLIC;

-- Only SELECT is permitted for authenticated users (own orders) and admins
CREATE POLICY "users read own orders" ON public.card_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.card_orders TO authenticated;

-- 7. Durable Order History / Events Table
CREATE TABLE IF NOT EXISTS public.card_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.card_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('customer', 'admin', 'system')),
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_order_events_order_idx ON public.card_order_events (order_id, created_at ASC);

ALTER TABLE public.card_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own order events" ON public.card_order_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.card_orders o
      WHERE o.id = card_order_events.order_id
        AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT ON public.card_order_events TO authenticated;

-- 8. Controlled Order Creation RPC (Derived strictly from trusted product catalog)
CREATE OR REPLACE FUNCTION public.create_physical_card_order(
  _card_id UUID,
  _product_id TEXT,
  _recipient_name TEXT,
  _recipient_phone TEXT,
  _shipping_address TEXT,
  _city TEXT,
  _postal_code TEXT DEFAULT NULL,
  _delivery_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile RECORD;
  _card RECORD;
  _product RECORD;
  _order_num TEXT;
  _order_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _card FROM public.cards WHERE id = _card_id AND user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card does not belong to the authenticated user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _product FROM public.physical_card_products WHERE id = _product_id AND is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid physical card product selected' USING ERRCODE = '22023';
  END IF;

  -- Guard against duplicate active orders for the same card
  IF EXISTS (
    SELECT 1 FROM public.card_orders
    WHERE card_id = _card_id AND fulfillment_status IN ('new', 'preparing', 'ready', 'shipped')
  ) THEN
    RAISE EXCEPTION 'An active physical card order is already in progress for this card' USING ERRCODE = '22023';
  END IF;

  _order_num := 'JT-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  INSERT INTO public.card_orders (
    order_number, user_id, card_id,
    customer_name, customer_email, customer_phone,
    card_name_snapshot, card_slug_snapshot, digital_card_token_snapshot,
    product_id, product_name, product_variant, sku, quantity,
    recipient_name, recipient_phone, shipping_address,
    city, postal_code, delivery_instructions,
    subtotal, total, currency
  ) VALUES (
    _order_num, _uid, _card.id,
    _profile.full_name, _profile.email, _profile.phone,
    COALESCE(_card.card_name, _card.full_name, 'Personal Card'), _card.slug, _card.id::text,
    _product.id, _product.name, _product.variant, _product.sku, 1,
    trim(_recipient_name), trim(_recipient_phone), trim(_shipping_address),
    trim(_city), NULLIF(trim(_postal_code), ''), NULLIF(trim(_delivery_instructions), ''),
    _product.price, _product.price, _product.currency
  ) RETURNING id INTO _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, 'created', 'customer', _uid, jsonb_build_object('order_number', _order_num, 'sku', _product.sku));

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'order_number', _order_num
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_physical_card_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_physical_card_order TO authenticated;

-- 9. Admin Order RPCs with Strict Hardening & Audit Logging
CREATE OR REPLACE FUNCTION public.admin_get_orders(
  _search TEXT DEFAULT NULL,
  _fulfillment_status TEXT DEFAULT NULL,
  _payment_status TEXT DEFAULT 'paid'
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

  SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT o.*, t.token AS active_nfc_token
    FROM public.card_orders o
    LEFT JOIN public.nfc_tags t ON t.id = o.nfc_tag_id
    WHERE (_query IS NULL
      OR o.order_number ILIKE '%' || _query || '%'
      OR o.customer_name ILIKE '%' || _query || '%'
      OR o.customer_email ILIKE '%' || _query || '%'
      OR o.card_name_snapshot ILIKE '%' || _query || '%'
      OR o.card_slug_snapshot ILIKE '%' || _query || '%'
      OR o.digital_card_token_snapshot ILIKE '%' || _query || '%'
      OR o.nfc_token_snapshot ILIKE '%' || _query || '%'
      OR o.tracking_number ILIKE '%' || _query || '%')
      AND (_fulfillment_status IS NULL OR _fulfillment_status = 'all' OR o.fulfillment_status = _fulfillment_status)
      AND (_payment_status IS NULL OR _payment_status = 'all' OR o.payment_status = _payment_status)
    ORDER BY o.created_at DESC
    LIMIT 200
  ) o;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_orders FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_orders TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_order_nfc(
  _order_id UUID,
  _nfc_token TEXT,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _tag RECORD;
BEGIN
  PERFORM public.require_admin();

  SELECT * INTO _order FROM public.card_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  -- Require an active, valid PAID order
  IF _order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Cannot assign NFC tag: Order must be paid before NFC assignment (current payment_status: %)',
      _order.payment_status USING ERRCODE = '22023';
  END IF;

  IF _order.fulfillment_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot assign NFC tag: Order is cancelled' USING ERRCODE = '22023';
  END IF;

  IF _order.fulfillment_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot assign NFC tag: Order is already completed' USING ERRCODE = '22023';
  END IF;

  IF _order.card_id IS NULL THEN
    RAISE EXCEPTION 'Cannot assign NFC tag: Target digital card is missing or was deleted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _tag FROM public.nfc_tags WHERE token = _nfc_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NFC tag not found' USING ERRCODE = 'P0002';
  END IF;

  IF _tag.status = 'revoked' THEN
    RAISE EXCEPTION 'Cannot assign a revoked NFC tag' USING ERRCODE = '22023';
  END IF;

  -- Ensure tag is not already assigned to another order
  IF EXISTS (
    SELECT 1 FROM public.card_orders
    WHERE nfc_tag_id = _tag.id AND id <> _order_id
  ) THEN
    RAISE EXCEPTION 'NFC tag is already permanently assigned to another order' USING ERRCODE = '22023';
  END IF;

  UPDATE public.nfc_tags
  SET card_id = _order.card_id,
      status = 'active'
  WHERE id = _tag.id;

  UPDATE public.card_orders
  SET nfc_tag_id = _tag.id,
      nfc_token_snapshot = _tag.token,
      updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, 'nfc_assigned', 'admin', auth.uid(), jsonb_build_object('token', _tag.token, 'tag_id', _tag.id));

  PERFORM public.append_admin_audit(
    'order_nfc_assigned', 'card_order', _order_id::text, 'success',
    jsonb_build_object(
      'order_number', _order.order_number,
      'tag_id', _tag.id,
      'card_id', _order.card_id,
      'token', _tag.token
    ),
    _release_identifier
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_order_nfc FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_order_nfc TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order_fulfillment(
  _order_id UUID,
  _fulfillment_status TEXT,
  _carrier TEXT DEFAULT NULL,
  _tracking_number TEXT DEFAULT NULL,
  _admin_notes TEXT DEFAULT NULL,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prev RECORD;
BEGIN
  PERFORM public.require_admin();

  -- Disallow completed via this RPC (must use admin_complete_order)
  IF _fulfillment_status = 'completed' THEN
    RAISE EXCEPTION 'admin_complete_order() must be used to complete an order' USING ERRCODE = '22023';
  END IF;

  IF _fulfillment_status NOT IN ('new', 'preparing', 'ready', 'shipped', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid fulfillment status: %', _fulfillment_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _prev FROM public.card_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  -- Require payment_status = 'paid' before entering manufacturing/fulfillment
  IF _fulfillment_status IN ('preparing', 'ready', 'shipped') AND _prev.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Cannot move unpaid order into fulfillment status % (payment_status: %)',
      _fulfillment_status, _prev.payment_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.card_orders
  SET fulfillment_status = _fulfillment_status,
      carrier = COALESCE(_carrier, carrier),
      tracking_number = COALESCE(_tracking_number, tracking_number),
      admin_notes = COALESCE(_admin_notes, admin_notes),
      shipped_at = CASE WHEN _fulfillment_status = 'shipped' AND shipped_at IS NULL THEN now() ELSE shipped_at END,
      updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, _fulfillment_status, 'admin', auth.uid(), jsonb_build_object('carrier', _carrier, 'tracking_number', _tracking_number));

  PERFORM public.append_admin_audit(
    'order_fulfillment_updated', 'card_order', _order_id::text, 'success',
    jsonb_build_object(
      'order_number', _prev.order_number,
      'previous_status', _prev.fulfillment_status,
      'new_status', _fulfillment_status
    ),
    _release_identifier
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_fulfillment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_fulfillment TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_complete_order(
  _order_id UUID,
  _release_identifier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
BEGIN
  PERFORM public.require_admin();

  SELECT * INTO _order FROM public.card_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF _order.fulfillment_status = 'completed' THEN
    RAISE EXCEPTION 'Order is already completed' USING ERRCODE = '22023';
  END IF;

  IF _order.fulfillment_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled order' USING ERRCODE = '22023';
  END IF;

  -- Payment Requirement: must be PAID
  IF _order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Cannot complete order: Payment status must be paid (current: %)', _order.payment_status
      USING ERRCODE = '22023';
  END IF;

  -- Physical NFC tag requirement
  IF _order.nfc_tag_id IS NULL OR _order.nfc_token_snapshot IS NULL THEN
    RAISE EXCEPTION 'Cannot complete order: Physical NFC tag has not been assigned' USING ERRCODE = '22023';
  END IF;

  -- Valid target card requirement
  IF _order.card_id IS NULL THEN
    RAISE EXCEPTION 'Cannot complete order: Target digital card is missing or was deleted' USING ERRCODE = '22023';
  END IF;

  UPDATE public.card_orders
  SET fulfillment_status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, 'completed', 'admin', auth.uid(), jsonb_build_object('order_number', _order.order_number));

  PERFORM public.append_admin_audit(
    'order_completed', 'card_order', _order_id::text, 'success',
    jsonb_build_object(
      'order_number', _order.order_number,
      'card_id', _order.card_id,
      'nfc_tag_id', _order.nfc_tag_id
    ),
    _release_identifier
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_complete_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_order TO authenticated;

-- 10. Non-Destructive Trial Downgrade & Primary Card Public Resolution Rule
DROP FUNCTION IF EXISTS public.get_public_card_by_slug(text);

CREATE FUNCTION public.get_public_card_by_slug(_slug TEXT)
RETURNS TABLE (
  id                      UUID,
  slug                    TEXT,
  full_name               TEXT,
  phone                   TEXT,
  email                   TEXT,
  title                   TEXT,
  company                 TEXT,
  bio                     TEXT,
  avatar_url              TEXT,
  logo_url                TEXT,
  show_logo_badge         BOOLEAN,
  header_pattern          TEXT,
  accent_color            TEXT,
  bg_color                TEXT,
  design_mode             TEXT,
  surface_color           TEXT,
  champagne_accent        TEXT,
  text_color              TEXT,
  surface_finish          TEXT,
  border_radius           TEXT,
  font_family             TEXT,
  whatsapp_phone          TEXT,
  whatsapp_message        TEXT,
  enable_arabic           BOOLEAN,
  full_name_ar            TEXT,
  title_ar                TEXT,
  bio_ar                  TEXT,
  social_links            JSONB,
  public_features         JSONB,
  public_features_enabled BOOLEAN,
  show_branding           BOOLEAN
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

    -- show_branding flag
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
    AND char_length(_slug) BETWEEN 2 AND 48
    -- Non-destructive downgrade rule: on Free / expired Trial, only the Primary card resolves publicly
    AND (
      c.plan_tier IN ('pro', 'enterprise')
      OR (c.plan_tier = 'trialing' AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = c.user_id
          AND p.trial_ends_at IS NOT NULL
          AND p.trial_ends_at > now()
      ))
      OR (c.is_primary IS TRUE)
    );
$$;

REVOKE ALL ON FUNCTION public.get_public_card_by_slug(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_card_by_slug(TEXT) TO anon, authenticated;
