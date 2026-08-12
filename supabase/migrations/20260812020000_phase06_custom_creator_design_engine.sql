-- Phase 06: Custom Creator design engine fields, constraints, and Pro entitlement enforcement

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS design_mode text DEFAULT 'classic_v2',
  ADD COLUMN IF NOT EXISTS surface_color text DEFAULT '#121216',
  ADD COLUMN IF NOT EXISTS champagne_accent text DEFAULT '#E6D5AC',
  ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#FAFAFA',
  ADD COLUMN IF NOT EXISTS surface_finish text DEFAULT 'matte',
  ADD COLUMN IF NOT EXISTS border_radius text DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Outfit';

-- Add check constraints for enum-like fields
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_design_mode_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_design_mode_values
  CHECK (design_mode IN ('classic_v2', 'custom'));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_header_pattern_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_header_pattern_values
  CHECK (header_pattern IN ('wave', 'diagonal', 'arch', 'geometric', 'none'));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_surface_finish_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_surface_finish_values
  CHECK (surface_finish IN ('flat', 'matte', 'glassmorphism', 'carbon_grain'));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_border_radius_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_border_radius_values
  CHECK (border_radius IN ('sharp', 'minimal', 'rounded'));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_font_family_values;
ALTER TABLE public.cards ADD CONSTRAINT cards_font_family_values
  CHECK (font_family IN ('Outfit', 'Space Grotesk', 'Plus Jakarta Sans'));

-- Pro entitlement enforcement trigger for Custom Creator design mode
CREATE OR REPLACE FUNCTION public.cards_enforce_pro_design_features()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND (NEW.plan_tier IS NULL OR NEW.plan_tier = 'free') THEN
    IF NEW.design_mode = 'custom' THEN
      RAISE EXCEPTION 'Custom Creator design engine requires a Pro subscription'
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
