-- Phase 07: expose only the persisted public design fields required by the shared renderer.

DROP FUNCTION IF EXISTS public.get_public_card_by_slug(text);

CREATE FUNCTION public.get_public_card_by_slug(_slug text)
RETURNS TABLE (
  id uuid, slug text, full_name text, phone text, email text, title text,
  company text, bio text, avatar_url text, logo_url text, show_logo_badge boolean,
  header_pattern text, accent_color text, bg_color text, design_mode text,
  surface_color text, champagne_accent text, text_color text, surface_finish text,
  border_radius text, font_family text, whatsapp_phone text, whatsapp_message text,
  enable_arabic boolean, full_name_ar text, title_ar text, bio_ar text,
  social_links jsonb, public_features jsonb, public_features_enabled boolean,
  show_branding boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.slug, c.full_name, c.phone, c.email, c.title, c.company, c.bio,
    c.avatar_url, c.logo_url, c.show_logo_badge,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.header_pattern ELSE 'wave' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.accent_color ELSE '#6B21A8' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.bg_color ELSE '#08080A' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN 'custom' ELSE 'classic_v2' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.surface_color ELSE '#121216' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.champagne_accent ELSE '#E6D5AC' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.text_color ELSE '#FAFAFA' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.surface_finish ELSE 'matte' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.border_radius ELSE 'minimal' END,
    CASE WHEN c.design_mode = 'custom' AND c.plan_tier IN ('pro', 'enterprise')
      THEN c.font_family ELSE 'Outfit' END,
    c.whatsapp_phone, c.whatsapp_message, c.enable_arabic,
    c.full_name_ar, c.title_ar, c.bio_ar, c.social_links,
    CASE WHEN c.plan_tier IN ('pro', 'enterprise') THEN jsonb_build_object(
      'video_url', c.pro_features->'video_url', 'pdf_url', c.pro_features->'pdf_url',
      'pdf_label', c.pro_features->'pdf_label', 'booking_url', c.pro_features->'booking_url',
      'custom_cta_label', c.pro_features->'custom_cta_label',
      'custom_cta_url', c.pro_features->'custom_cta_url'
    ) ELSE null END,
    c.plan_tier IN ('pro', 'enterprise'),
    NOT (c.plan_tier IN ('pro', 'enterprise') AND coalesce((c.pro_features->>'remove_branding')::boolean, false))
  FROM public.cards c
  WHERE c.slug = _slug AND c.is_active IS true
    AND _slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(_slug) BETWEEN 2 AND 48;
$$;

REVOKE ALL ON FUNCTION public.get_public_card_by_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_card_by_slug(text) TO anon, authenticated;
