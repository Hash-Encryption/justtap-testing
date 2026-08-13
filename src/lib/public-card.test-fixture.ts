import type { Card, ProFeatures } from "./card";

export type PublicCardTestRow = Pick<
  Card,
  | "id"
  | "slug"
  | "full_name"
  | "phone"
  | "email"
  | "title"
  | "company"
  | "bio"
  | "avatar_url"
  | "logo_url"
  | "show_logo_badge"
  | "header_pattern"
  | "accent_color"
  | "bg_color"
  | "design_mode"
  | "surface_color"
  | "champagne_accent"
  | "text_color"
  | "surface_finish"
  | "border_radius"
  | "font_family"
  | "whatsapp_phone"
  | "whatsapp_message"
  | "enable_arabic"
  | "full_name_ar"
  | "title_ar"
  | "bio_ar"
  | "social_links"
> & {
  plan_tier: Card["plan_tier"];
  pro_features: ProFeatures;
  is_active: boolean;
  public_features: {
    video_url?: string | null;
    pdf_url?: string | null;
    pdf_label?: string | null;
    booking_url?: string | null;
    custom_cta_label?: string | null;
    custom_cta_url?: string | null;
  } | null;
  public_features_enabled: boolean;
  show_branding: boolean;
};

export function makePublicCardRow(overrides: Partial<PublicCardTestRow> = {}): PublicCardTestRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "known-card",
    full_name: "Known Card",
    phone: "+966500000000",
    email: "public@example.com",
    title: "Founder",
    company: "JustTap",
    bio: "A public profile",
    avatar_url: null,
    logo_url: null,
    show_logo_badge: true,
    header_pattern: "wave",
    accent_color: "#8b5cf6",
    bg_color: "#ffffff",
    design_mode: "classic_v2",
    surface_color: "#121216",
    champagne_accent: "#E6D5AC",
    text_color: "#FAFAFA",
    surface_finish: "matte",
    border_radius: "minimal",
    font_family: "Outfit",
    whatsapp_phone: "+966500000000",
    whatsapp_message: "Hello",
    enable_arabic: false,
    full_name_ar: null,
    title_ar: null,
    bio_ar: null,
    social_links: { website: "https://example.com" },
    plan_tier: "pro",
    pro_features: {
      video_url: "https://example.com/video",
      pdf_url: "https://example.com/file.pdf",
      pdf_label: "Profile",
      booking_url: "https://example.com/book",
      custom_cta_label: "Contact",
      custom_cta_url: "https://example.com/contact",
      remove_branding: true,
      notify_email: "private@example.com",
      webhook_url: "https://private.example.com/hook",
      enable_email_alerts: true,
      enable_lead_webhook: true,
    },
    is_active: true,
    public_features: {
      video_url: "https://example.com/video",
      pdf_url: "https://example.com/file.pdf",
      pdf_label: "Profile",
      booking_url: "https://example.com/book",
      custom_cta_label: "Contact",
      custom_cta_url: "https://example.com/contact",
    },
    public_features_enabled: true,
    show_branding: false,
    ...overrides,
  };
}
