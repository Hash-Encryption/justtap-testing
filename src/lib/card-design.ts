import {
  colorContrast,
  isValidHexColor,
  readableOn,
  FINISHES,
  FONT_OPTIONS,
  PATTERNS,
  RADIUS_OPTIONS,
  type BorderRadius,
  type Card,
  type FontFamily,
  type HeaderPattern,
  type SurfaceFinish,
} from "./card";

export const CLASSIC_V2_DESIGN = {
  mode: "classic_v2" as const,
  bgColor: "#08080A",
  surfaceColor: "#121216",
  accentColor: "#6B21A8",
  champagneAccent: "#E6D5AC",
  textColor: "#FAFAFA",
  onAccentColor: "#FFFFFF",
  headerPattern: "wave",
  surfaceFinish: "matte",
  borderRadius: "minimal",
  fontFamily: "Outfit",
} as const;

export type CardDesign =
  | typeof CLASSIC_V2_DESIGN
  | {
      mode: "custom";
      bgColor: string;
      surfaceColor: string;
      accentColor: string;
      champagneAccent: string;
      textColor: string;
      onAccentColor: "#000000" | "#FFFFFF";
      headerPattern: HeaderPattern;
      surfaceFinish: SurfaceFinish;
      borderRadius: BorderRadius;
      fontFamily: FontFamily;
    };

type DesignCard = Pick<
  Card,
  | "design_mode"
  | "bg_color"
  | "surface_color"
  | "accent_color"
  | "champagne_accent"
  | "text_color"
  | "header_pattern"
  | "surface_finish"
  | "border_radius"
  | "font_family"
> &
  Partial<Pick<Card, "plan_tier" | "trial_ends_at">>;

/**
 * Returns true when the card has effective Pro entitlement.
 *
 * Rules (client-side, for UI gating only):
 *   pro | enterprise  → always entitled
 *   trialing          → entitled while trial_ends_at is in the future
 *   free / missing    → not entitled
 *
 * Authoritative enforcement is in the SQL RPC (server-time check). This
 * helper is used for rendering decisions; a stale client cannot grant itself
 * Pro access because the public card data comes from get_public_card_by_slug
 * which enforces expiry server-side.
 */
export function isProEntitled(card: {
  plan_tier?: Card["plan_tier"];
  trial_ends_at?: string | null;
}): boolean {
  if (card.plan_tier === "pro" || card.plan_tier === "enterprise") return true;
  if (card.plan_tier === "trialing" && card.trial_ends_at) {
    return new Date(card.trial_ends_at) > new Date();
  }
  return false;
}

const MIN_TEXT_CONTRAST = 4.5;

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function composite(foreground: string, background: string, alpha: number) {
  const fg = rgb(foreground);
  const bg = rgb(background);
  return `#${fg
    .map((channel, index) => Math.round(channel * alpha + bg[index] * (1 - alpha)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export type ContrastWarning = {
  pair: string;
  foreground: string;
  background: string;
  contrast: number;
  message: string;
};

export function getPaletteContrastWarnings(colors: {
  textColor?: string;
  bgColor?: string;
  surfaceColor?: string;
  accentColor?: string;
  champagneAccent?: string;
  surfaceFinish?: SurfaceFinish;
}): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  const text = colors.textColor || CLASSIC_V2_DESIGN.textColor;
  const surface = colors.surfaceColor || CLASSIC_V2_DESIGN.surfaceColor;
  const bg = colors.bgColor || CLASSIC_V2_DESIGN.bgColor;
  const champagne = colors.champagneAccent || CLASSIC_V2_DESIGN.champagneAccent;
  const finish = colors.surfaceFinish || "matte";

  if (
    !isValidHexColor(text) ||
    !isValidHexColor(surface) ||
    !isValidHexColor(bg) ||
    !isValidHexColor(champagne)
  ) {
    return warnings;
  }

  const effectiveSurface =
    finish === "glassmorphism" ? composite(surface, bg, 0xe6 / 255) : surface;

  const textSurfaceContrast = colorContrast(text, effectiveSurface);
  if (textSurfaceContrast < 4.5) {
    warnings.push({
      pair: "Text on Surface",
      foreground: text,
      background: effectiveSurface,
      contrast: Number(textSurfaceContrast.toFixed(2)),
      message: `Text color (${text}) has low contrast (${textSurfaceContrast.toFixed(1)}:1, recommended \u2265 4.5:1) on surface (${surface}).`,
    });
  }

  const champagneSurfaceContrast = colorContrast(champagne, effectiveSurface);
  if (champagneSurfaceContrast < 3.0) {
    warnings.push({
      pair: "Secondary Accent on Surface",
      foreground: champagne,
      background: effectiveSurface,
      contrast: Number(champagneSurfaceContrast.toFixed(2)),
      message: `Secondary accent (${champagne}) has low contrast (${champagneSurfaceContrast.toFixed(1)}:1, recommended \u2265 3.0:1) on surface (${surface}).`,
    });
  }

  return warnings;
}

export function resolveCardDesign(
  card: DesignCard,
  options?: { previewProDesign?: boolean },
): CardDesign {
  const entitled =
    Boolean(options?.previewProDesign) || !("plan_tier" in card) || isProEntitled(card);
  if (card.design_mode !== "custom" || !entitled) return CLASSIC_V2_DESIGN;

  const colors = [
    card.bg_color,
    card.surface_color,
    card.accent_color,
    card.champagne_accent,
    card.text_color,
  ];
  const headerPattern = PATTERNS.find(({ value }) => value === card.header_pattern)?.value;
  const surfaceFinish = FINISHES.find(({ value }) => value === card.surface_finish)?.value;
  const borderRadius = RADIUS_OPTIONS.find(({ value }) => value === card.border_radius)?.value;
  const fontFamily = FONT_OPTIONS.find(({ value }) => value === card.font_family)?.value;
  if (
    colors.some((color) => !isValidHexColor(color)) ||
    !headerPattern ||
    !surfaceFinish ||
    !borderRadius ||
    !fontFamily
  ) {
    return CLASSIC_V2_DESIGN;
  }

  return {
    mode: "custom",
    bgColor: card.bg_color,
    surfaceColor: card.surface_color!,
    accentColor: card.accent_color,
    champagneAccent: card.champagne_accent!,
    textColor: card.text_color!,
    onAccentColor: readableOn(card.accent_color),
    headerPattern,
    surfaceFinish,
    borderRadius,
    fontFamily,
  };
}

export function cardRadius(radius: BorderRadius) {
  if (radius === "sharp") return "0px";
  if (radius === "rounded") return "2rem";
  return "1rem";
}

export function cardFont(font: FontFamily) {
  return `'${font}', ui-sans-serif, system-ui, sans-serif`;
}
