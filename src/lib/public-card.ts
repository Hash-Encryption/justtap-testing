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
  "whatsapp_phone",
  "whatsapp_message",
  "enable_arabic",
  "full_name_ar",
  "title_ar",
  "bio_ar",
  "social_links",
] as const;

export const PUBLIC_CARD_SELECT = [
  ...PUBLIC_CARD_FIELDS,
  // These three fields are consumed only by the server mapper and are not
  // returned as part of PublicCard.
  "plan_tier",
  "pro_features",
  "is_active",
].join(",");

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
  | { status: "invalid_slug" | "not_found" | "inactive" | "service_error" };

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
    return { status: "service_error" };
  }

  if (result.error) {
    options.onServiceError?.(result.error);
    return { status: "service_error" };
  }

  if (!result.data) return { status: "not_found" };

  const row = result.data as PublicCardFields & {
    plan_tier?: Card["plan_tier"];
    pro_features?: ProFeatures | null;
    is_active?: boolean | null;
  };

  // Fail closed if activation state is missing or false.
  if (row.is_active !== true) return { status: "inactive" };

  const publicFeaturesEnabled = row.plan_tier === "pro" || row.plan_tier === "enterprise";
  const pro = row.pro_features;
  const publicFeatures: PublicProFeatures | null =
    publicFeaturesEnabled && pro
      ? {
          video_url: pro.video_url ?? null,
          pdf_url: pro.pdf_url ?? null,
          pdf_label: pro.pdf_label ?? null,
          booking_url: pro.booking_url ?? null,
          custom_cta_label: pro.custom_cta_label ?? null,
          custom_cta_url: pro.custom_cta_url ?? null,
        }
      : null;

  const card = Object.fromEntries(
    PUBLIC_CARD_FIELDS.map((field) => [field, row[field]]),
  ) as PublicCardFields;

  return {
    status: "found",
    card: {
      ...card,
      public_features: publicFeatures,
      public_features_enabled: publicFeaturesEnabled,
      show_branding: !publicFeaturesEnabled || pro?.remove_branding !== true,
    },
  };
}
