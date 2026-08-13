import type { Card, ProFeatures } from "./card";
import { validateSlug } from "./slug";

const PUBLIC_CARD_FIELDS = [
  "id",
  "slug",
  "full_name",
  "phone",
  "email",
  "title",
  "company",
  "bio",
  "avatar_url",
  "logo_url",
  "show_logo_badge",
  "header_pattern",
  "accent_color",
  "bg_color",
  "design_mode",
  "surface_color",
  "champagne_accent",
  "text_color",
  "surface_finish",
  "border_radius",
  "font_family",
  "whatsapp_phone",
  "whatsapp_message",
  "enable_arabic",
  "full_name_ar",
  "title_ar",
  "bio_ar",
  "social_links",
] as const;

export type PublicProFeatures = Pick<
  ProFeatures,
  "video_url" | "pdf_url" | "pdf_label" | "booking_url" | "custom_cta_label" | "custom_cta_url"
>;

type PublicCardFields = Pick<Card, (typeof PUBLIC_CARD_FIELDS)[number]>;

export type PublicCard = PublicCardFields & {
  public_features: PublicProFeatures | null;
  public_features_enabled: boolean;
  show_branding: boolean;
};

export type PublicCardLookupResult =
  | { status: "found"; card: PublicCard }
  | { status: "invalid_slug" | "not_found" | "inactive" }
  | { status: "service_error"; message?: string };

export type PublicCardQueryResult = {
  data: unknown | null;
  error: { code?: string; message?: string } | null;
};

export type PublicCardLookup = (slug: string) => Promise<PublicCardQueryResult>;

type ResolveOptions = {
  onServiceError?: (error: unknown) => void;
};

export async function resolvePublicCardBySlug(
  input: string,
  lookup: PublicCardLookup,
  options: ResolveOptions = {},
): Promise<PublicCardLookupResult> {
  const validated = validateSlug(input);
  if (!validated.valid) return { status: "invalid_slug" };

  let result: PublicCardQueryResult;
  try {
    result = await lookup(validated.slug);
  } catch (error) {
    options.onServiceError?.(error);
    return { status: "service_error", message: String(error) };
  }

  if (result.error) {
    options.onServiceError?.(result.error);
    return { status: "service_error", message: result.error.message };
  }

  if (!result.data) return { status: "not_found" };

  const rows = Array.isArray(result.data) ? result.data : [result.data];
  if (rows.length === 0 || !rows[0] || typeof rows[0] !== "object") {
    return { status: "not_found" };
  }

  const row = rows[0] as PublicCard;
  if (!row.id || !row.full_name) return { status: "not_found" };

  const card = Object.fromEntries(
    PUBLIC_CARD_FIELDS.map((field) => [field, row[field]]),
  ) as PublicCardFields;

  return {
    status: "found",
    card: {
      ...card,
      public_features: row.public_features,
      public_features_enabled: row.public_features_enabled === true,
      show_branding: row.show_branding !== false,
    },
  };
}
