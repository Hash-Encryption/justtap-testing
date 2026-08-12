-- Phase 06 follow-up: Customer-safe RPC to retrieve NFC tag status and permanent token for cards owned by auth.uid()

CREATE OR REPLACE FUNCTION public.get_customer_card_tags()
RETURNS TABLE (
  assigned_card_id uuid,
  status text,
  token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NULL OR auth.role() = 'anon' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.card_id AS assigned_card_id,
    t.status::text,
    t.token::text
  FROM public.nfc_tags t
  JOIN public.cards c ON c.id = t.card_id
  WHERE c.user_id = auth.uid()
    AND t.card_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_card_tags() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_customer_card_tags() FROM anon;

CREATE OR REPLACE FUNCTION public.get_customer_card_tag(_card_id uuid)
RETURNS TABLE (
  assigned_card_id uuid,
  status text,
  token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NULL OR auth.role() = 'anon' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.card_id AS assigned_card_id,
    t.status::text,
    t.token::text
  FROM public.nfc_tags t
  JOIN public.cards c ON c.id = t.card_id
  WHERE c.id = _card_id
    AND c.user_id = auth.uid()
    AND t.card_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_card_tag(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_customer_card_tag(uuid) FROM anon;
