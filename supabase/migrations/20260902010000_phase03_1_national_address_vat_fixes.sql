-- ============================================================================
-- JUSTTAP PHASE 3.1: NATIONAL ADDRESS & VAT CORRECTIONS MIGRATION
-- Target Project: nlumgigqlaymjiwgpvtp
-- ============================================================================

-- 1. Add national_address column to public.card_orders
ALTER TABLE public.card_orders
  ADD COLUMN IF NOT EXISTS national_address TEXT;

-- Backfill national_address from shipping_address for existing orders
UPDATE public.card_orders
SET national_address = shipping_address
WHERE national_address IS NULL;

-- 2. Drop existing overloaded function signatures to prevent 42725 ambiguity
DROP FUNCTION IF EXISTS public.create_physical_card_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_physical_card_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 3. Create updated create_physical_card_order RPC
CREATE OR REPLACE FUNCTION public.create_physical_card_order(
  _card_id UUID,
  _product_id TEXT,
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
  _product RECORD;
  _order_num TEXT;
  _order_id UUID;
  _resolved_address TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
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
    recipient_name, recipient_phone, national_address, shipping_address,
    city, postal_code, delivery_instructions,
    subtotal, discount, shipping_cost, tax, total, currency
  ) VALUES (
    _order_num, _uid, _card.id,
    _profile.full_name, _profile.email, _profile.phone,
    COALESCE(_card.card_name, _card.full_name, 'Personal Card'), _card.slug, _card.id::text,
    _product.id, _product.name, _product.variant, _product.sku, 1,
    trim(_recipient_name), trim(_recipient_phone), _resolved_address, _resolved_address,
    trim(_city), NULLIF(trim(_postal_code), ''), NULLIF(trim(_delivery_instructions), ''),
    _product.price, 0.00, 0.00, 0.00, _product.price, _product.currency
  ) RETURNING id INTO _order_id;

  INSERT INTO public.card_order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (_order_id, 'created', 'customer', _uid, jsonb_build_object('order_number', _order_num, 'sku', _product.sku));

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'order_number', _order_num
  );
END;
$$;

-- 4. Permissions with explicit typed signatures
REVOKE ALL ON FUNCTION public.create_physical_card_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_physical_card_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
