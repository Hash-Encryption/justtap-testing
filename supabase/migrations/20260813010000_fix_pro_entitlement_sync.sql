-- Keep trusted account membership and card entitlement in sync.

CREATE OR REPLACE FUNCTION public.reject_client_card_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_tier text;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF tg_op = 'INSERT' THEN
      SELECT p.plan_tier INTO _profile_tier
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
      LIMIT 1;

      NEW.plan_tier := CASE
        WHEN _profile_tier IN ('pro', 'enterprise') THEN _profile_tier
        ELSE 'free'
      END;
    ELSIF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'plan_tier is controlled by trusted billing or admin operations'
        USING errcode = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_client_card_entitlement_change() FROM public;

CREATE OR REPLACE FUNCTION public.reject_client_profile_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
    AND NOT public.has_role(auth.uid(), 'admin')
    AND NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
  THEN
    RAISE EXCEPTION 'plan_tier is controlled by trusted billing or admin operations'
      USING errcode = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_client_profile_entitlement_change() FROM public;

DROP TRIGGER IF EXISTS profiles_reject_client_entitlement_change ON public.profiles;
CREATE TRIGGER profiles_reject_client_entitlement_change
  BEFORE UPDATE OF plan_tier ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_client_profile_entitlement_change();

CREATE OR REPLACE FUNCTION public.sync_profile_plan_to_cards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier AND NEW.user_id IS NOT NULL THEN
    UPDATE public.cards
    SET plan_tier = NEW.plan_tier
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_plan_to_cards() FROM public;

DROP TRIGGER IF EXISTS profiles_sync_plan_to_cards ON public.profiles;
CREATE TRIGGER profiles_sync_plan_to_cards
  AFTER UPDATE OF plan_tier ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_plan_to_cards();

-- Repair cards created after their owning account had already become Pro.
UPDATE public.cards AS c
SET plan_tier = p.plan_tier
FROM public.profiles AS p
WHERE p.user_id = c.user_id
  AND p.plan_tier IN ('pro', 'enterprise')
  AND c.plan_tier = 'free';
