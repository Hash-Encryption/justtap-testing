-- ============================================================================
-- JUSTTAP PHASE 4: PRODUCTION-READY DATABASE MIGRATION
-- Billing, Subscriptions, Physical-Card Commerce & Pricing System
-- Target Project: nlumgigqlaymjiwgpvtp
-- ============================================================================

-- 1. Centralized Billing Plans Table
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  card_limit INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.billing_plans (id, code, name, name_ar, card_limit, features, is_active)
VALUES
  (
    'free',
    'free',
    'JustTap Free',
    'JustTap مجاني',
    1,
    '["1 Digital Card", "QR Code", "vCard Download", "Classic V2 Theme"]'::jsonb,
    true
  ),
  (
    'pro',
    'pro',
    'JustTap Pro',
    'JustTap برو',
    3,
    '["3 Digital Cards", "Custom Creator Engine", "Remove JustTap Branding", "Video Introduction", "PDF Brochure", "Appointment Booking", "Custom CTA", "Connection Alerts", "Lead Webhooks", "Apple Wallet Pass"]'::jsonb,
    true
  ),
  (
    'enterprise',
    'enterprise',
    'JustTap Enterprise',
    'JustTap للمؤسسات',
    5,
    '["5 Digital Cards", "Team Multi-Card Management", "Dedicated Support", "Priority NFC Card Fulfillment"]'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  card_limit = EXCLUDED.card_limit,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read billing plans" ON public.billing_plans FOR SELECT USING (is_active IS TRUE);
GRANT SELECT ON public.billing_plans TO authenticated, anon;

-- 2. Centralized Billing Prices Table
CREATE TABLE IF NOT EXISTS public.billing_prices (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  billing_interval TEXT NOT NULL DEFAULT 'year' CHECK (billing_interval IN ('month', 'year', 'one_time')),
  billing_interval_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_self_service BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.billing_prices (id, plan_id, amount_minor, currency, billing_interval, billing_interval_count, is_active, is_self_service)
VALUES
  ('price_free_0', 'free', 0, 'SAR', 'year', 1, true, true),
  ('price_pro_annual_99_sar', 'pro', 9900, 'SAR', 'year', 1, true, true)
ON CONFLICT (id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  amount_minor = EXCLUDED.amount_minor,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  billing_interval_count = EXCLUDED.billing_interval_count,
  is_active = EXCLUDED.is_active,
  is_self_service = EXCLUDED.is_self_service,
  updated_at = now();

ALTER TABLE public.billing_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read billing prices" ON public.billing_prices FOR SELECT USING (is_active IS TRUE);
GRANT SELECT ON public.billing_prices TO authenticated, anon;

-- 3. Update Authoritative Physical Card Catalog (Matte Card = 149 SAR)
-- Note: Historical order records remain intact with their created snapshots.
UPDATE public.physical_card_products
SET
  price = 149.00,
  name = 'JustTap Matte Card',
  name_ar = 'بطاقة JustTap الذكية (مطفي)',
  variant = 'Matte Black PVC',
  variant_ar = 'أسود مطفي',
  sku = 'JT-NFC-PVC-BLK'
WHERE id = 'pvc_matte_black';

-- 4. Centralized Commercial Offers Table (Pro + NFC Card Bundle)
CREATE TABLE IF NOT EXISTS public.billing_offers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  amount_minor INTEGER NOT NULL DEFAULT 19900,
  currency TEXT NOT NULL DEFAULT 'SAR',
  included_plan_id TEXT NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  included_price_id TEXT NOT NULL REFERENCES public.billing_prices(id) ON DELETE RESTRICT,
  included_physical_product_id TEXT NOT NULL REFERENCES public.physical_card_products(id) ON DELETE RESTRICT,
  included_physical_quantity INTEGER NOT NULL DEFAULT 1 CHECK (included_physical_quantity = 1),
  initial_subscription_duration_days INTEGER NOT NULL DEFAULT 365,
  renewal_price_id TEXT NOT NULL REFERENCES public.billing_prices(id) ON DELETE RESTRICT,
  savings_amount_minor INTEGER NOT NULL DEFAULT 4900,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.billing_offers (
  id, code, name, name_ar, amount_minor, currency,
  included_plan_id, included_price_id, included_physical_product_id, included_physical_quantity,
  initial_subscription_duration_days, renewal_price_id, savings_amount_minor, is_active, metadata
)
VALUES (
  'offer_pro_nfc_bundle',
  'pro_nfc_bundle',
  'Pro + NFC Card Bundle',
  'باقة برو + بطاقة NFC الذكية',
  19900,
  'SAR',
  'pro',
  'price_pro_annual_99_sar',
  'pvc_matte_black',
  1,
  365,
  'price_pro_annual_99_sar',
  4900,
  true,
  '{"badge": "Best Value", "badge_ar": "القيمة الأفضل"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  amount_minor = EXCLUDED.amount_minor,
  currency = EXCLUDED.currency,
  included_plan_id = EXCLUDED.included_plan_id,
  included_price_id = EXCLUDED.included_price_id,
  included_physical_product_id = EXCLUDED.included_physical_product_id,
  included_physical_quantity = EXCLUDED.included_physical_quantity,
  initial_subscription_duration_days = EXCLUDED.initial_subscription_duration_days,
  renewal_price_id = EXCLUDED.renewal_price_id,
  savings_amount_minor = EXCLUDED.savings_amount_minor,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = now();

ALTER TABLE public.billing_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read billing offers" ON public.billing_offers FOR SELECT USING (is_active IS TRUE);
GRANT SELECT ON public.billing_offers TO authenticated, anon;

-- 5. Safe Payment Methods Table (Tokenization Container - Zero Raw PAN/CVV)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT,
  provider_token_reference TEXT,
  type TEXT NOT NULL DEFAULT 'card',
  brand TEXT,
  last_four TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_methods_user_idx ON public.payment_methods (user_id, status);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
-- Direct SELECT is revoked from clients to protect provider_token_reference;
-- Client access is provided via the safe projection RPC get_user_payment_methods().
REVOKE ALL ON public.payment_methods FROM PUBLIC, anon, authenticated;

-- 6. Subscriptions Table (Authoritative Subscription Ledger)
-- Non-destructive account deletion: user_id ON DELETE SET NULL to preserve financial history
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  price_id TEXT NOT NULL REFERENCES public.billing_prices(id) ON DELETE RESTRICT,
  originating_offer_id TEXT REFERENCES public.billing_offers(id) ON DELETE SET NULL,
  provider TEXT,
  provider_customer_reference TEXT,
  provider_subscription_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_charge_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  past_due_since TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  default_payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_status_next_charge_idx ON public.subscriptions (status, next_charge_at);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon, PUBLIC;

CREATE POLICY "users read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.subscriptions TO authenticated;

-- 7. Payments Ledger Table (Authoritative Financial Transactions)
-- Non-destructive account deletion: user_id ON DELETE SET NULL to preserve financial history
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL
    CHECK (purpose IN ('subscription_initial', 'subscription_renewal', 'subscription_upgrade', 'physical_card_order', 'pro_nfc_bundle')),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.card_orders(id) ON DELETE SET NULL,
  offer_id TEXT REFERENCES public.billing_offers(id) ON DELETE SET NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  provider TEXT,
  provider_payment_id TEXT,
  provider_status TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'initiated', 'requires_action', 'authorized', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded')),
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  payment_method_snapshot JSONB,
  failure_code TEXT,
  failure_message TEXT,
  initiated_at TIMESTAMPTZ,
  authorized_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS payments_subscription_idx ON public.payments (subscription_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_idempotency_idx ON public.payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated, anon, PUBLIC;

CREATE POLICY "users read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.payments TO authenticated;

-- 8. Payment Refunds Table
-- Non-destructive account deletion: requested_by ON DELETE SET NULL
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  type TEXT NOT NULL CHECK (type IN ('full', 'partial')),
  reason TEXT,
  admin_note TEXT,
  provider_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'succeeded', 'failed')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_refunds_payment_idx ON public.payment_refunds (payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_refunds_status_idx ON public.payment_refunds (status);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payment_refunds FROM authenticated, anon, PUBLIC;

CREATE POLICY "users read own payment refunds" ON public.payment_refunds
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_refunds.payment_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT ON public.payment_refunds TO authenticated;

-- 9. Lifecycle Auditing & Event Streams
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('customer', 'admin', 'system')),
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_sub_idx ON public.subscription_events (subscription_id, created_at ASC);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_events FROM authenticated, anon, PUBLIC;

CREATE POLICY "users read own subscription events" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_events.subscription_id
        AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT ON public.subscription_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('customer', 'admin', 'system')),
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_pay_idx ON public.payment_events (payment_id, created_at ASC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payment_events FROM authenticated, anon, PUBLIC;

CREATE POLICY "users read own payment events" ON public.payment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_events.payment_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT ON public.payment_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_payment_id TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'ignored', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  payload_hash TEXT,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_idx ON public.payment_webhook_events (provider, provider_event_id);
CREATE INDEX IF NOT EXISTS payment_webhook_events_status_idx ON public.payment_webhook_events (processing_status, received_at DESC);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 10. RPC FUNCTIONS
-- ============================================================================

-- Safe Public / Customer Commercial Catalog Provider
CREATE OR REPLACE FUNCTION public.get_public_commercial_catalog()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plans JSONB;
  _prices JSONB;
  _offers JSONB;
  _products JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.card_limit ASC), '[]'::jsonb)
  INTO _plans
  FROM public.billing_plans p
  WHERE p.is_active IS TRUE;

  SELECT COALESCE(jsonb_agg(to_jsonb(pr) ORDER BY pr.amount_minor ASC), '[]'::jsonb)
  INTO _prices
  FROM public.billing_prices pr
  WHERE pr.is_active IS TRUE AND pr.is_self_service IS TRUE;

  SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
  INTO _offers
  FROM public.billing_offers o
  WHERE o.is_active IS TRUE;

  SELECT COALESCE(jsonb_agg(to_jsonb(prod)), '[]'::jsonb)
  INTO _products
  FROM public.physical_card_products prod
  WHERE prod.is_active IS TRUE;

  RETURN jsonb_build_object(
    'plans', _plans,
    'prices', _prices,
    'offers', _offers,
    'products', _products
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_commercial_catalog TO authenticated, anon;

-- Safe Customer Payment Methods Projection (Guaranteed zero provider token exposure)
CREATE OR REPLACE FUNCTION public.get_user_payment_methods()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _methods JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pm.id,
        'type', pm.type,
        'brand', pm.brand,
        'last_four', pm.last_four,
        'expiry_month', pm.expiry_month,
        'expiry_year', pm.expiry_year,
        'status', pm.status,
        'is_default', pm.is_default,
        'created_at', pm.created_at
      )
      ORDER BY pm.is_default DESC, pm.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _methods
  FROM public.payment_methods pm
  WHERE pm.user_id = _uid AND pm.status = 'active';

  RETURN _methods;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_payment_methods FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_payment_methods TO authenticated;

-- Customer Billing Overview & Subscription Snapshot
CREATE OR REPLACE FUNCTION public.get_user_billing_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile RECORD;
  _sub RECORD;
  _card_count INTEGER;
  _max_allowed INTEGER;
  _effective_tier TEXT;
  _trial_days_remaining INTEGER := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  _effective_tier := _profile.plan_tier;
  IF _effective_tier = 'trialing' AND (_profile.trial_ends_at IS NULL OR _profile.trial_ends_at <= now()) THEN
    _effective_tier := 'free';
  ELSIF _effective_tier = 'trialing' AND _profile.trial_ends_at > now() THEN
    _trial_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (_profile.trial_ends_at - now())) / 86400)::INTEGER);
  END IF;

  _max_allowed := CASE
    WHEN _effective_tier = 'enterprise' THEN 5
    WHEN _effective_tier IN ('pro', 'trialing') THEN 3
    ELSE 1
  END;

  SELECT count(*) INTO _card_count FROM public.cards WHERE user_id = _uid;

  -- Find latest active/pending subscription
  SELECT s.*, p.code AS plan_code, p.name AS plan_name, pr.amount_minor, pr.currency
  INTO _sub
  FROM public.subscriptions s
  JOIN public.billing_plans p ON p.id = s.plan_id
  JOIN public.billing_prices pr ON pr.id = s.price_id
  WHERE s.user_id = _uid
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'plan_tier', _effective_tier,
    'is_trial_active', (_profile.plan_tier = 'trialing' AND _profile.trial_ends_at > now()),
    'trial_ends_at', _profile.trial_ends_at,
    'trial_days_remaining', _trial_days_remaining,
    'card_count', _card_count,
    'card_limit', _max_allowed,
    'subscription', CASE
      WHEN _sub.id IS NOT NULL THEN jsonb_build_object(
        'id', _sub.id,
        'status', _sub.status,
        'plan_id', _sub.plan_id,
        'plan_name', _sub.plan_name,
        'amount_minor', _sub.amount_minor,
        'currency', _sub.currency,
        'current_period_start', _sub.current_period_start,
        'current_period_end', _sub.current_period_end,
        'next_charge_at', _sub.next_charge_at,
        'cancel_at_period_end', _sub.cancel_at_period_end,
        'created_at', _sub.created_at
      )
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_billing_overview FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_billing_overview TO authenticated;

-- Customer Billing History RPC
CREATE OR REPLACE FUNCTION public.get_user_billing_history()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _payments JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'purpose', p.purpose,
        'amount_minor', p.amount_minor,
        'currency', p.currency,
        'status', p.status,
        'order_id', p.order_id,
        'order_number', o.order_number,
        'subscription_id', p.subscription_id,
        'offer_id', p.offer_id,
        'created_at', p.created_at,
        'paid_at', p.paid_at,
        'refunded_at', p.refunded_at,
        'payment_method', p.payment_method_snapshot
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _payments
  FROM public.payments p
  LEFT JOIN public.card_orders o ON o.id = p.order_id
  WHERE p.user_id = _uid;

  RETURN _payments;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_billing_history FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_billing_history TO authenticated;

-- Durable Idempotent Bundle Order & Subscription Creator
CREATE OR REPLACE FUNCTION public.create_bundle_order_and_subscription(
  _idempotency_key TEXT,
  _card_id UUID,
  _recipient_name TEXT,
  _recipient_phone TEXT,
  _national_address TEXT,
  _city TEXT,
  _postal_code TEXT DEFAULT NULL,
  _delivery_instructions TEXT DEFAULT NULL,
  _shipping_address TEXT DEFAULT NULL
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
  _offer RECORD;
  _product RECORD;
  _order_num TEXT;
  _order_id UUID;
  _sub_id UUID;
  _payment_id UUID;
  _resolved_address TEXT;
  _existing_payment RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 1. Idempotency Guard: If payment with this key exists, return existing bundle state
  IF _idempotency_key IS NOT NULL AND trim(_idempotency_key) <> '' THEN
    SELECT p.id AS payment_id, p.order_id, p.subscription_id, o.order_number
    INTO _existing_payment
    FROM public.payments p
    LEFT JOIN public.card_orders o ON o.id = p.order_id
    WHERE p.idempotency_key = trim(_idempotency_key) AND p.user_id = _uid;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'order_id', _existing_payment.order_id,
        'order_number', _existing_payment.order_number,
        'subscription_id', _existing_payment.subscription_id,
        'payment_id', _existing_payment.payment_id,
        'amount_minor', 19900,
        'currency', 'SAR',
        'status', 'awaiting_payment_provider',
        'idempotent_replay', true
      );
    END IF;
  END IF;

  _resolved_address := trim(COALESCE(_national_address, _shipping_address, ''));
  IF _resolved_address = '' THEN
    RAISE EXCEPTION 'National Address is required' USING ERRCODE = '22023';
  END IF;

  IF trim(COALESCE(_city, '')) = '' THEN
    RAISE EXCEPTION 'City is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _card FROM public.cards WHERE id = _card_id AND user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card does not belong to the authenticated user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _offer FROM public.billing_offers WHERE code = 'pro_nfc_bundle' AND is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle offer not available' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _product FROM public.physical_card_products WHERE id = _offer.included_physical_product_id AND is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Included physical card product not available' USING ERRCODE = '22023';
  END IF;

  -- Guard against active duplicate physical orders for the same card
  IF EXISTS (
    SELECT 1 FROM public.card_orders
    WHERE card_id = _card_id AND fulfillment_status IN ('new', 'preparing', 'ready', 'shipped')
  ) THEN
    RAISE EXCEPTION 'An active physical card order is already in progress for this card' USING ERRCODE = '22023';
  END IF;

  -- 2. Create Pending Subscription
  INSERT INTO public.subscriptions (
    user_id, plan_id, price_id, originating_offer_id, status
  ) VALUES (
    _uid, _offer.included_plan_id, _offer.included_price_id, _offer.id, 'pending'
  ) RETURNING id INTO _sub_id;

  INSERT INTO public.subscription_events (subscription_id, event_type, actor_type, actor_id, metadata)
  VALUES (_sub_id, 'bundle_checkout_initiated', 'customer', _uid, jsonb_build_object('offer_code', _offer.code));

  -- 3. Create Physical Card Order (Quantity strictly = 1)
  _order_num := 'JT-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  INSERT INTO public.card_orders (
    order_number, user_id, card_id,
    customer_name, customer_email, customer_phone,
    card_name_snapshot, card_slug_snapshot, digital_card_token_snapshot,
    product_id, product_name, product_variant, sku, quantity,
    recipient_name, recipient_phone, national_address, shipping_address,
    city, postal_code, delivery_instructions,
    subtotal, discount, shipping_cost, tax, total, currency,
    payment_status, fulfillment_status
  ) VALUES (
    _order_num, _uid, _card.id,
    _profile.full_name, _profile.email, _profile.phone,
    COALESCE(_card.card_name, _card.full_name, 'Personal Card'), _card.slug, _card.id::text,
    _product.id, _product.name, _product.variant, _product.sku, 1,
    trim(_recipient_name), trim(_recipient_phone), _resolved_address, _resolved_address,
    trim(_city), NULLIF(trim(_postal_code), ''), NULLIF(trim(_delivery_instructions), ''),
    199.00, 0.00, 0.00, 0.00, 199.00, 'SAR',
    'pending', 'new'
  ) RETURNING id INTO _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, 'bundle_created', 'customer', _uid, jsonb_build_object('order_number', _order_num, 'offer_id', _offer.id));

  -- 4. Create Authoritative Payment Intent Record
  INSERT INTO public.payments (
    idempotency_key, user_id, purpose, subscription_id, order_id, offer_id,
    amount_minor, currency, status, metadata
  ) VALUES (
    NULLIF(trim(_idempotency_key), ''), _uid, 'pro_nfc_bundle', _sub_id, _order_id, _offer.id,
    _offer.amount_minor, _offer.currency, 'created',
    jsonb_build_object('bundle_code', _offer.code, 'card_id', _card.id, 'order_number', _order_num)
  ) RETURNING id INTO _payment_id;

  INSERT INTO public.payment_events (payment_id, event_type, actor_type, actor_id, metadata)
  VALUES (_payment_id, 'created', 'customer', _uid, jsonb_build_object('purpose', 'pro_nfc_bundle', 'amount_minor', _offer.amount_minor));

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'order_number', _order_num,
    'subscription_id', _sub_id,
    'payment_id', _payment_id,
    'amount_minor', _offer.amount_minor,
    'currency', _offer.currency,
    'status', 'awaiting_payment_provider'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bundle_order_and_subscription FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bundle_order_and_subscription TO authenticated;

-- ============================================================================
-- 11. ADMIN PRIVILEGED BILLING RPCS
-- ============================================================================

-- Admin Billing Overview KPI Aggregate
CREATE OR REPLACE FUNCTION public.admin_get_billing_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_payments INTEGER := 0;
  _pending_payments INTEGER := 0;
  _paid_payments INTEGER := 0;
  _failed_payments INTEGER := 0;
  _partially_refunded INTEGER := 0;
  _refunded INTEGER := 0;
  _paid_revenue_minor BIGINT := 0;
  _active_subscriptions INTEGER := 0;
  _trialing_subscriptions INTEGER := 0;
  _past_due_subscriptions INTEGER := 0;
  _cancelled_subscriptions INTEGER := 0;
  _reconciliation_issues INTEGER := 0;
BEGIN
  PERFORM public.require_admin();

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'created' OR status = 'initiated' OR status = 'requires_action'),
    count(*) FILTER (WHERE status = 'paid'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status = 'partially_refunded'),
    count(*) FILTER (WHERE status = 'refunded'),
    COALESCE(SUM(amount_minor) FILTER (WHERE status = 'paid' OR status = 'partially_refunded'), 0)
  INTO
    _total_payments,
    _pending_payments,
    _paid_payments,
    _failed_payments,
    _partially_refunded,
    _refunded,
    _paid_revenue_minor
  FROM public.payments;

  SELECT
    count(*) FILTER (WHERE status = 'active'),
    count(*) FILTER (WHERE status = 'trialing'),
    count(*) FILTER (WHERE status = 'past_due'),
    count(*) FILTER (WHERE status = 'cancelled')
  INTO
    _active_subscriptions,
    _trialing_subscriptions,
    _past_due_subscriptions,
    _cancelled_subscriptions
  FROM public.subscriptions;

  -- Diagnostic Count: Paid physical orders without NFC assignment OR completed orders without paid status
  SELECT count(*)
  INTO _reconciliation_issues
  FROM public.card_orders
  WHERE (fulfillment_status = 'completed' AND payment_status <> 'paid')
     OR (fulfillment_status = 'completed' AND nfc_token_snapshot IS NULL);

  RETURN jsonb_build_object(
    'total_payments', _total_payments,
    'pending_payments', _pending_payments,
    'paid_payments', _paid_payments,
    'failed_payments', _failed_payments,
    'partially_refunded', _partially_refunded,
    'refunded', _refunded,
    'paid_revenue_minor', _paid_revenue_minor,
    'currency', 'SAR',
    'active_subscriptions', _active_subscriptions,
    'trialing_subscriptions', _trialing_subscriptions,
    'past_due_subscriptions', _past_due_subscriptions,
    'cancelled_subscriptions', _cancelled_subscriptions,
    'reconciliation_issues', _reconciliation_issues
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_billing_overview FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_billing_overview TO authenticated;

-- Admin Payments Queue RPC
CREATE OR REPLACE FUNCTION public.admin_get_payments(
  _search TEXT DEFAULT NULL,
  _status TEXT DEFAULT 'all',
  _purpose TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _query TEXT := NULLIF(trim(COALESCE(_search, '')), '');
  _result JSONB;
BEGIN
  PERFORM public.require_admin();

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'customer_name', COALESCE(prof.full_name, 'Unknown Customer'),
        'customer_email', COALESCE(prof.email, 'No Email'),
        'purpose', p.purpose,
        'amount_minor', p.amount_minor,
        'currency', p.currency,
        'status', p.status,
        'provider', p.provider,
        'provider_payment_id', p.provider_payment_id,
        'order_id', p.order_id,
        'order_number', o.order_number,
        'subscription_id', p.subscription_id,
        'offer_id', p.offer_id,
        'created_at', p.created_at,
        'paid_at', p.paid_at,
        'refunded_at', p.refunded_at,
        'refunds_count', (SELECT count(*) FROM public.payment_refunds pr WHERE pr.payment_id = p.id)
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _result
  FROM public.payments p
  LEFT JOIN public.profiles prof ON prof.user_id = p.user_id
  LEFT JOIN public.card_orders o ON o.id = p.order_id
  WHERE (_query IS NULL
    OR p.id::text ILIKE '%' || _query || '%'
    OR o.order_number ILIKE '%' || _query || '%'
    OR prof.full_name ILIKE '%' || _query || '%'
    OR prof.email ILIKE '%' || _query || '%'
    OR p.provider_payment_id ILIKE '%' || _query || '%')
    AND (_status IS NULL OR _status = 'all' OR p.status = _status)
    AND (_purpose IS NULL OR _purpose = 'all' OR p.purpose = _purpose)
  LIMIT 200;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_payments FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_payments TO authenticated;

-- Admin Payment Detail RPC
CREATE OR REPLACE FUNCTION public.admin_get_payment_detail(_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p RECORD;
  _prof RECORD;
  _order RECORD;
  _sub RECORD;
  _refunds JSONB;
  _events JSONB;
  _refundable_minor INTEGER;
  _sum_refunds BIGINT;
BEGIN
  PERFORM public.require_admin();

  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _prof FROM public.profiles WHERE user_id = _p.user_id;
  SELECT * INTO _order FROM public.card_orders WHERE id = _p.order_id;
  SELECT s.*, pl.name AS plan_name FROM public.subscriptions s JOIN public.billing_plans pl ON pl.id = s.plan_id WHERE s.id = _p.subscription_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'amount_minor', pr.amount_minor,
        'currency', pr.currency,
        'type', pr.type,
        'status', pr.status,
        'reason', pr.reason,
        'admin_note', pr.admin_note,
        'requested_at', pr.requested_at,
        'processed_at', pr.processed_at
      )
      ORDER BY pr.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _refunds
  FROM public.payment_refunds pr
  WHERE pr.payment_id = _payment_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pe.id,
        'event_type', pe.event_type,
        'actor_type', pe.actor_type,
        'actor_id', pe.actor_id,
        'metadata', pe.metadata,
        'created_at', pe.created_at
      )
      ORDER BY pe.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO _events
  FROM public.payment_events pe
  WHERE pe.payment_id = _payment_id;

  -- Calculate remaining refundable balance
  SELECT COALESCE(SUM(amount_minor), 0)
  INTO _sum_refunds
  FROM public.payment_refunds
  WHERE payment_id = _payment_id AND status IN ('requested', 'processing', 'succeeded');

  _refundable_minor := GREATEST(0, _p.amount_minor - _sum_refunds::INTEGER);

  RETURN jsonb_build_object(
    'payment', jsonb_build_object(
      'id', _p.id,
      'purpose', _p.purpose,
      'amount_minor', _p.amount_minor,
      'currency', _p.currency,
      'status', _p.status,
      'provider', _p.provider,
      'provider_payment_id', _p.provider_payment_id,
      'payment_method_snapshot', _p.payment_method_snapshot,
      'failure_code', _p.failure_code,
      'failure_message', _p.failure_message,
      'initiated_at', _p.initiated_at,
      'paid_at', _p.paid_at,
      'refunded_at', _p.refunded_at,
      'created_at', _p.created_at,
      'remaining_refundable_minor', _refundable_minor
    ),
    'customer', CASE
      WHEN _prof.id IS NOT NULL THEN jsonb_build_object(
        'user_id', _prof.user_id,
        'full_name', _prof.full_name,
        'email', _prof.email,
        'phone', _prof.phone,
        'plan_tier', _prof.plan_tier
      )
      ELSE NULL
    END,
    'order', CASE
      WHEN _order.id IS NOT NULL THEN jsonb_build_object(
        'id', _order.id,
        'order_number', _order.order_number,
        'product_name', _order.product_name,
        'product_variant', _order.product_variant,
        'card_slug', _order.card_slug_snapshot,
        'total', _order.total,
        'fulfillment_status', _order.fulfillment_status,
        'nfc_token', _order.nfc_token_snapshot
      )
      ELSE NULL
    END,
    'subscription', CASE
      WHEN _sub.id IS NOT NULL THEN jsonb_build_object(
        'id', _sub.id,
        'plan_name', _sub.plan_name,
        'status', _sub.status,
        'current_period_start', _sub.current_period_start,
        'current_period_end', _sub.current_period_end
      )
      ELSE NULL
    END,
    'refunds', _refunds,
    'events', _events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_payment_detail FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_payment_detail TO authenticated;

-- Admin Subscriptions Queue RPC
CREATE OR REPLACE FUNCTION public.admin_get_subscriptions(
  _search TEXT DEFAULT NULL,
  _status TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _query TEXT := NULLIF(trim(COALESCE(_search, '')), '');
  _result JSONB;
BEGIN
  PERFORM public.require_admin();

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'user_id', s.user_id,
        'customer_name', COALESCE(prof.full_name, 'Unknown Customer'),
        'customer_email', COALESCE(prof.email, 'No Email'),
        'plan_id', s.plan_id,
        'plan_name', pl.name,
        'originating_offer_id', s.originating_offer_id,
        'status', s.status,
        'current_period_start', s.current_period_start,
        'current_period_end', s.current_period_end,
        'next_charge_at', s.next_charge_at,
        'cancel_at_period_end', s.cancel_at_period_end,
        'cancelled_at', s.cancelled_at,
        'created_at', s.created_at
      )
      ORDER BY s.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _result
  FROM public.subscriptions s
  JOIN public.billing_plans pl ON pl.id = s.plan_id
  LEFT JOIN public.profiles prof ON prof.user_id = s.user_id
  WHERE (_query IS NULL
    OR s.id::text ILIKE '%' || _query || '%'
    OR prof.full_name ILIKE '%' || _query || '%'
    OR prof.email ILIKE '%' || _query || '%')
    AND (_status IS NULL OR _status = 'all' OR s.status = _status)
  LIMIT 200;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_subscriptions FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_subscriptions TO authenticated;

-- Admin Refund Request RPC (Validates paid status, remaining balance, admin auth; sets status = 'requested')
CREATE OR REPLACE FUNCTION public.admin_request_refund(
  _idempotency_key TEXT,
  _payment_id UUID,
  _amount_minor INTEGER,
  _reason TEXT DEFAULT NULL,
  _admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_uid UUID;
  _p RECORD;
  _sum_refunds BIGINT;
  _remaining_minor INTEGER;
  _refund_id UUID;
  _refund_type TEXT;
  _existing_refund RECORD;
BEGIN
  _admin_uid := public.require_admin();

  IF _idempotency_key IS NOT NULL AND trim(_idempotency_key) <> '' THEN
    SELECT * INTO _existing_refund FROM public.payment_refunds WHERE idempotency_key = trim(_idempotency_key);
    IF FOUND THEN
      RETURN jsonb_build_object(
        'refund_id', _existing_refund.id,
        'payment_id', _existing_refund.payment_id,
        'amount_minor', _existing_refund.amount_minor,
        'status', _existing_refund.status,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF _amount_minor <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF _p.status NOT IN ('paid', 'partially_refunded') THEN
    RAISE EXCEPTION 'Payment is not eligible for refund (current status: %)', _p.status USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(amount_minor), 0)
  INTO _sum_refunds
  FROM public.payment_refunds
  WHERE payment_id = _payment_id AND status IN ('requested', 'processing', 'succeeded');

  _remaining_minor := _p.amount_minor - _sum_refunds::INTEGER;

  IF _amount_minor > _remaining_minor THEN
    RAISE EXCEPTION 'Requested refund amount (% minor) exceeds remaining refundable balance (% minor)', _amount_minor, _remaining_minor USING ERRCODE = '22023';
  END IF;

  _refund_type := CASE WHEN _amount_minor = _p.amount_minor THEN 'full' ELSE 'partial' END;

  INSERT INTO public.payment_refunds (
    idempotency_key, payment_id, amount_minor, currency, type,
    reason, admin_note, status, requested_by, requested_at
  ) VALUES (
    NULLIF(trim(_idempotency_key), ''), _payment_id, _amount_minor, _p.currency, _refund_type,
    NULLIF(trim(_reason), ''), NULLIF(trim(_admin_note), ''), 'requested', _admin_uid, now()
  ) RETURNING id INTO _refund_id;

  INSERT INTO public.payment_events (payment_id, event_type, actor_type, actor_id, metadata)
  VALUES (
    _payment_id, 'refund_requested', 'admin', _admin_uid,
    jsonb_build_object('refund_id', _refund_id, 'amount_minor', _amount_minor, 'type', _refund_type)
  );

  INSERT INTO public.admin_audit_log (actor_user_id, action, target_type, target_id, result, change_summary)
  VALUES (
    _admin_uid, 'request_payment_refund', 'payment', _payment_id::text, 'success',
    jsonb_build_object('refund_id', _refund_id, 'amount_minor', _amount_minor, 'type', _refund_type)
  );

  RETURN jsonb_build_object(
    'refund_id', _refund_id,
    'payment_id', _payment_id,
    'amount_minor', _amount_minor,
    'currency', _p.currency,
    'type', _refund_type,
    'status', 'requested',
    'remaining_refundable_minor', _remaining_minor - _amount_minor
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_request_refund FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_request_refund TO authenticated;

-- Admin Reconciliation Diagnostics RPC
CREATE OR REPLACE FUNCTION public.admin_get_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unpaid_completed_orders JSONB;
  _unassigned_completed_orders JSONB;
  _active_sub_unpaid_payments JSONB;
BEGIN
  PERFORM public.require_admin();

  -- 1. Completed orders without paid payment status
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'order_id', id,
        'order_number', order_number,
        'payment_status', payment_status,
        'fulfillment_status', fulfillment_status,
        'created_at', created_at
      )
    ),
    '[]'::jsonb
  )
  INTO _unpaid_completed_orders
  FROM public.card_orders
  WHERE fulfillment_status = 'completed' AND payment_status <> 'paid';

  -- 2. Completed orders without physical NFC assignment
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'order_id', id,
        'order_number', order_number,
        'fulfillment_status', fulfillment_status,
        'created_at', created_at
      )
    ),
    '[]'::jsonb
  )
  INTO _unassigned_completed_orders
  FROM public.card_orders
  WHERE fulfillment_status = 'completed' AND nfc_token_snapshot IS NULL;

  -- 3. Active subscriptions with only failed or unconfirmed initial payments
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'subscription_id', s.id,
        'user_id', s.user_id,
        'plan_id', s.plan_id,
        'status', s.status
      )
    ),
    '[]'::jsonb
  )
  INTO _active_sub_unpaid_payments
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.subscription_id = s.id AND p.status = 'paid'
    );

  RETURN jsonb_build_object(
    'diagnostic_timestamp', now(),
    'provider_reconciliation_status', 'awaiting_payment_provider_integration',
    'unpaid_completed_orders', _unpaid_completed_orders,
    'unassigned_completed_orders', _unassigned_completed_orders,
    'active_sub_unpaid_payments', _active_sub_unpaid_payments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_reconciliation FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_reconciliation TO authenticated;
