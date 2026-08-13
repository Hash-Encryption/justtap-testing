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
  Partial<Pick<Card, "plan_tier">>;

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

function hasReadablePalette(
  textColor: string,
  bgColor: string,
  surfaceColor: string,
  accentColor: string,
  champagneAccent: string,
  finish: SurfaceFinish,
) {
  const bodyBackground =
    finish === "glassmorphism" ? composite(surfaceColor, bgColor, 0xe6 / 255) : surfaceColor;
  const contactBackground = composite(accentColor, bodyBackground, 0x24 / 255);
  const socialBackground = composite(textColor, bodyBackground, 0x08 / 255);
  const pdfBackground = composite(accentColor, bodyBackground, 0x14 / 255);
  const primaryBackgrounds = [
    bgColor,
    bodyBackground,
    contactBackground,
    socialBackground,
    pdfBackground,
  ];
  const champagneBackgrounds = [bodyBackground, contactBackground, socialBackground, pdfBackground];

  return (
    primaryBackgrounds.every(
      (background) => colorContrast(textColor, background) >= MIN_TEXT_CONTRAST,
    ) &&
    champagneBackgrounds.every(
      (background) => colorContrast(champagneAccent, background) >= MIN_TEXT_CONTRAST,
    )
  );
}

export function resolveCardDesign(card: DesignCard): CardDesign {
  const entitled =
    !("plan_tier" in card) || card.plan_tier === "pro" || card.plan_tier === "enterprise";
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
    !fontFamily ||
    !hasReadablePalette(
      card.text_color!,
      card.bg_color,
      card.surface_color!,
      card.accent_color,
      card.champagne_accent!,
      surfaceFinish,
    )
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
