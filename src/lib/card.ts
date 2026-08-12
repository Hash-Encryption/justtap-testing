import { normalizeSlug } from "./slug";

export type SocialLinks = {
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
};

export type DesignMode = "classic_v2" | "custom";
export type HeaderPattern = "wave" | "diagonal" | "arch" | "geometric" | "none";
export type SurfaceFinish = "flat" | "matte" | "glassmorphism" | "carbon_grain";
export type BorderRadius = "sharp" | "minimal" | "rounded";
export type FontFamily = "Outfit" | "Space Grotesk" | "Plus Jakarta Sans";

export type PlanTier = "free" | "pro" | "enterprise";

export type ProFeatures = {
  video_url?: string | null;
  pdf_url?: string | null;
  pdf_label?: string | null;
  booking_url?: string | null;
  custom_cta_label?: string | null;
  custom_cta_url?: string | null;
  enable_wallet_pass?: boolean;
  remove_branding?: boolean;
  enable_email_alerts?: boolean;
  notify_email?: string | null;
  enable_lead_webhook?: boolean;
  webhook_url?: string | null;
};

export type Card = {
  id: string;
  user_id: string;
  slug: string;
  full_name: string;
  phone: string;
  email: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  show_logo_badge: boolean;
  header_pattern: HeaderPattern;
  accent_color: string;
  bg_color: string;
  design_mode?: DesignMode;
  surface_color?: string;
  champagne_accent?: string;
  text_color?: string;
  surface_finish?: SurfaceFinish;
  border_radius?: BorderRadius;
  font_family?: FontFamily;
  whatsapp_phone: string | null;
  whatsapp_message: string | null;
  enable_arabic: boolean;
  full_name_ar: string | null;
  title_ar: string | null;
  bio_ar: string | null;
  social_links: SocialLinks | null;
  plan_tier?: PlanTier;
  pro_features?: ProFeatures | null;
  is_active?: boolean;
  created_at?: string;
};

export const COLOR_PRESETS = [
  { name: "Royal Purple", value: "#6B21A8" },
  { name: "Corporate Navy", value: "#2563eb" },
  { name: "Emerald Mint", value: "#059669" },
  { name: "Cyberpunk", value: "#38bdf8" },
  { name: "Monochrome", value: "#111827" },
  { name: "Sunset Gold", value: "#d97706" },
] as const;

export const DESIGN_PRESET_PALETTES = [
  {
    id: "royal_obsidian",
    name: "Royal Obsidian",
    bg_color: "#08080A",
    surface_color: "#121216",
    accent_color: "#6B21A8",
    champagne_accent: "#E6D5AC",
    text_color: "#FAFAFA",
  },
  {
    id: "champagne_luxe",
    name: "Champagne Luxe",
    bg_color: "#0B0B0E",
    surface_color: "#16161D",
    accent_color: "#E6D5AC",
    champagne_accent: "#6B21A8",
    text_color: "#FAFAFA",
  },
  {
    id: "deep_velvet",
    name: "Deep Velvet",
    bg_color: "#110A1F",
    surface_color: "#1A102E",
    accent_color: "#7E22CE",
    champagne_accent: "#E6D5AC",
    text_color: "#FAFAFA",
  },
  {
    id: "monochrome_luxe",
    name: "Monochrome Luxe",
    bg_color: "#050507",
    surface_color: "#0E0E12",
    accent_color: "#FAFAFA",
    champagne_accent: "#D8C397",
    text_color: "#FAFAFA",
  },
] as const;

export const PATTERNS: { value: HeaderPattern; label: string }[] = [
  { value: "wave", label: "Wave" },
  { value: "diagonal", label: "Diagonal" },
  { value: "arch", label: "Arch" },
  { value: "geometric", label: "Geometric" },
  { value: "none", label: "None" },
];

export const FINISHES: { value: SurfaceFinish; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "matte", label: "Matte" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "carbon_grain", label: "Carbon Grain" },
];

export const RADIUS_OPTIONS: { value: BorderRadius; label: string }[] = [
  { value: "sharp", label: "Sharp" },
  { value: "minimal", label: "Minimal" },
  { value: "rounded", label: "Rounded" },
];

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "Outfit", label: "Outfit" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
];

export const defaultProFeatures: ProFeatures = {
  video_url: "",
  pdf_url: "",
  pdf_label: "View Brochure / Menu (PDF)",
  booking_url: "",
  custom_cta_label: "Book Consultation",
  custom_cta_url: "",
  enable_wallet_pass: true,
  remove_branding: false,
  enable_email_alerts: true,
  notify_email: "",
  enable_lead_webhook: false,
  webhook_url: "",
};

export const emptyCard: Card = {
  id: "",
  user_id: "",
  slug: "",
  full_name: "",
  phone: "",
  email: "",
  title: "",
  company: "",
  bio: "",
  avatar_url: null,
  logo_url: null,
  show_logo_badge: true,
  header_pattern: "wave",
  accent_color: "#6B21A8",
  bg_color: "#08080A",
  design_mode: "classic_v2",
  surface_color: "#121216",
  champagne_accent: "#E6D5AC",
  text_color: "#FAFAFA",
  surface_finish: "matte",
  border_radius: "minimal",
  font_family: "Outfit",
  whatsapp_phone: "",
  whatsapp_message: "Hi! I just scanned your digital card.",
  enable_arabic: false,
  full_name_ar: "",
  title_ar: "",
  bio_ar: "",
  social_links: { linkedin: "", instagram: "", twitter: "", website: "" },
  plan_tier: "free",
  pro_features: defaultProFeatures,
};

export function slugify(input: string) {
  return normalizeSlug(input);
}

/** Converts YouTube (watch, shorts, embed, shorts links), Vimeo, Loom, and Google Drive URLs to embeddable iframe URLs */
export function getEmbedVideoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. YouTube Shorts match: youtube.com/shorts/VIDEO_ID
  const ytShorts = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShorts && ytShorts[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytShorts[1]}`;
  }

  // 2. YouTube standard watch, embed, or short link (youtu.be/ID or watch?v=ID)
  const ytStandard = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i,
  );
  if (ytStandard && ytStandard[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytStandard[1]}`;
  }

  // 3. Loom match: loom.com/share/ID or loom.com/embed/ID
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-f0-9-]+)/i);
  if (loomMatch && loomMatch[1]) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  // 4. Vimeo match: vimeo.com/ID or vimeo.com/video/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // 5. Google Drive video file match: drive.google.com/file/d/FILE_ID/view
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // 6. Direct HTTPS embed link fallback
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }

  return null;
}

/** Validates standard 6-digit hex color format (e.g. #6B21A8) */
export function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color.trim());
}

/** Escapes special vCard 3.0 characters (backslashes, semicolons, commas, newlines). */
export function escapeVCardText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Readable text color for a given hex background. */
export function readableOn(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

export function buildVCard(
  card: Pick<Card, "full_name" | "company" | "title" | "phone" | "email" | "social_links" | "bio">,
) {
  const fullNameEscaped = card.full_name.trim();
  const parts = fullNameEscaped.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : fullNameEscaped;
  const linkedin = card.social_links?.linkedin;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardText(last)};${escapeVCardText(first)};;;`,
    `FN:${escapeVCardText(fullNameEscaped)}`,
    card.company ? `ORG:${escapeVCardText(card.company)}` : null,
    card.title ? `TITLE:${escapeVCardText(card.title)}` : null,
    card.phone ? `TEL;TYPE=CELL:${card.phone.trim()}` : null,
    card.email ? `EMAIL;TYPE=INTERNET:${card.email.trim()}` : null,
    linkedin ? `URL;TYPE=LinkedIn:${linkedin.trim()}` : null,
    card.social_links?.website ? `URL:${card.social_links.website.trim()}` : null,
    card.bio ? `NOTE:${escapeVCardText(card.bio)}` : null,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/** Auto-formats WhatsApp phone numbers: removes leading 0s/00/+, auto-adds default country code (e.g. 966) if missing. */
export function formatWhatsAppNumber(
  phone: string | null | undefined,
  defaultCountryCode = "966",
): string {
  if (!phone) return "";
  let cleaned = phone.trim();

  // Strip leading 00 or +
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Remove non-digit characters
  cleaned = cleaned.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  // If starts with leading '0' (e.g. 0501234567), strip '0' and prepend country code
  if (cleaned.startsWith("0")) {
    cleaned = defaultCountryCode + cleaned.replace(/^0+/, "");
  } else if (
    cleaned.length >= 8 &&
    cleaned.length <= 10 &&
    !cleaned.startsWith(defaultCountryCode)
  ) {
    // If entered without leading zero or country code (e.g. 501234567), prepend country code
    cleaned = defaultCountryCode + cleaned;
  }

  // Fix country code followed by a local zero (e.g. 9660501234567 -> 966501234567)
  if (cleaned.startsWith(`${defaultCountryCode}0`)) {
    cleaned = defaultCountryCode + cleaned.slice(defaultCountryCode.length + 1);
  }

  return cleaned;
}
