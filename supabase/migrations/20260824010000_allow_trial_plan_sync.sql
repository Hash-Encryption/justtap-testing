-- Allow trusted server RPCs (like start_pro_trial) and plan sync triggers to update plan_tier
-- while preserving strict client rejection for unprivileged direct table mutations.

CREATE OR REPLACE FUNCTION public.reject_client_profile_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When executed by postgres (inside trusted SECURITY DEFINER RPCs like start_pro_trial), permit update
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.reject_client_card_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_tier text;
BEGIN
  -- When executed by postgres (inside trusted sync trigger or SECURITY DEFINER RPCs), permit update
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF tg_op = 'INSERT' THEN
      SELECT p.plan_tier INTO _profile_tier
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
      LIMIT 1;

      NEW.plan_tier := CASE
        WHEN _profile_tier IN ('pro', 'enterprise', 'trialing') THEN _profile_tier
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
