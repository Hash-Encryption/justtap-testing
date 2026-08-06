export type SocialLinks = {
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
};

export type HeaderPattern = "wave" | "diagonal" | "arch";

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
  whatsapp_phone: string | null;
  whatsapp_message: string | null;
  enable_arabic: boolean;
  full_name_ar: string | null;
  title_ar: string | null;
  bio_ar: string | null;
  social_links: SocialLinks | null;
  is_active?: boolean;
  created_at?: string;
};

export const COLOR_PRESETS = [
  { name: "Royal Purple", value: "#8b5cf6" },
  { name: "Corporate Navy", value: "#2563eb" },
  { name: "Emerald Mint", value: "#059669" },
  { name: "Cyberpunk", value: "#38bdf8" },
  { name: "Monochrome", value: "#111827" },
  { name: "Sunset Gold", value: "#d97706" },
] as const;

export const PATTERNS: { value: HeaderPattern; label: string }[] = [
  { value: "wave", label: "Wave" },
  { value: "diagonal", label: "Diagonal" },
  { value: "arch", label: "Arch" },
];

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
  accent_color: "#8b5cf6",
  bg_color: "#ffffff",
  whatsapp_phone: "",
  whatsapp_message: "Hi! I just scanned your digital card.",
  enable_arabic: false,
  full_name_ar: "",
  title_ar: "",
  bio_ar: "",
  social_links: { linkedin: "", instagram: "", twitter: "", website: "" },
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
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

export function buildVCard(card: Card) {
  const parts = card.full_name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : card.full_name;
  const linkedin = card.social_links?.linkedin;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${card.full_name}`,
    card.company ? `ORG:${card.company}` : null,
    card.title ? `TITLE:${card.title}` : null,
    card.phone ? `TEL;TYPE=CELL:${card.phone}` : null,
    card.email ? `EMAIL;TYPE=INTERNET:${card.email}` : null,
    linkedin ? `URL;TYPE=LinkedIn:${linkedin}` : null,
    card.social_links?.website ? `URL:${card.social_links.website}` : null,
    card.bio ? `NOTE:${card.bio.replace(/\n/g, "\\n")}` : null,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/** Auto-formats WhatsApp phone numbers: removes leading 0s/00/+, auto-adds default country code (e.g. 966) if missing. */
export function formatWhatsAppNumber(phone: string | null | undefined, defaultCountryCode = "966"): string {
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
  } else if (cleaned.length >= 8 && cleaned.length <= 10 && !cleaned.startsWith(defaultCountryCode)) {
    // If entered without leading zero or country code (e.g. 501234567), prepend country code
    cleaned = defaultCountryCode + cleaned;
  }

  // Fix country code followed by a local zero (e.g. 9660501234567 -> 966501234567)
  if (cleaned.startsWith(`${defaultCountryCode}0`)) {
    cleaned = defaultCountryCode + cleaned.slice(defaultCountryCode.length + 1);
  }

  return cleaned;
}
