-- Phase 06 follow-up: Database-level CHECK constraints for hex color validation

-- Normalize any nulls or unformatted legacy colors to safe defaults before adding constraints
UPDATE public.cards SET bg_color = '#08080A' WHERE bg_color IS NULL OR bg_color !~ '^#[0-9A-Fa-f]{6}$';
UPDATE public.cards SET surface_color = '#121216' WHERE surface_color IS NULL OR surface_color !~ '^#[0-9A-Fa-f]{6}$';
UPDATE public.cards SET accent_color = '#6B21A8' WHERE accent_color IS NULL OR accent_color !~ '^#[0-9A-Fa-f]{6}$';
UPDATE public.cards SET champagne_accent = '#E6D5AC' WHERE champagne_accent IS NULL OR champagne_accent !~ '^#[0-9A-Fa-f]{6}$';
UPDATE public.cards SET text_color = '#FAFAFA' WHERE text_color IS NULL OR text_color !~ '^#[0-9A-Fa-f]{6}$';

-- Add hex format CHECK constraints
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_bg_color_hex;
ALTER TABLE public.cards ADD CONSTRAINT cards_bg_color_hex
  CHECK (bg_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_surface_color_hex;
ALTER TABLE public.cards ADD CONSTRAINT cards_surface_color_hex
  CHECK (surface_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_accent_color_hex;
ALTER TABLE public.cards ADD CONSTRAINT cards_accent_color_hex
  CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_champagne_accent_hex;
ALTER TABLE public.cards ADD CONSTRAINT cards_champagne_accent_hex
  CHECK (champagne_accent ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_text_color_hex;
ALTER TABLE public.cards ADD CONSTRAINT cards_text_color_hex
  CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$');
