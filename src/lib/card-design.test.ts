import { describe, expect, it } from "vitest";
import {
  colorContrast,
  DESIGN_PRESET_PALETTES,
  emptyCard,
  FINISHES,
  FONT_OPTIONS,
  PATTERNS,
  type Card,
} from "./card";
import {
  CLASSIC_V2_DESIGN,
  cardFont,
  cardRadius,
  getPaletteContrastWarnings,
  resolveCardDesign,
} from "./card-design";

const customCard: Card = {
  ...emptyCard,
  plan_tier: "pro",
  design_mode: "custom",
  bg_color: "#010203",
  surface_color: "#111213",
  accent_color: "#212223",
  champagne_accent: "#D1D2D3",
  text_color: "#F1F2F3",
  header_pattern: "geometric",
  surface_finish: "carbon_grain",
  border_radius: "rounded",
  font_family: "Space Grotesk",
};

describe("Phase 07 shared card design & Custom Creator resolver", () => {
  it("locks Classic V2 even when stale custom values remain", () => {
    expect(resolveCardDesign({ ...customCard, design_mode: "classic_v2" })).toEqual(
      CLASSIC_V2_DESIGN,
    );
  });

  it("applies all five persisted custom colors", () => {
    expect(resolveCardDesign(customCard)).toMatchObject({
      mode: "custom",
      bgColor: "#010203",
      surfaceColor: "#111213",
      accentColor: "#212223",
      champagneAccent: "#D1D2D3",
      textColor: "#F1F2F3",
    });
  });

  it.each(PATTERNS)("supports the $label divider", ({ value }) => {
    expect(resolveCardDesign({ ...customCard, header_pattern: value }).headerPattern).toBe(value);
  });

  it.each(FINISHES)("supports the $label finish", ({ value }) => {
    expect(resolveCardDesign({ ...customCard, surface_finish: value }).surfaceFinish).toBe(value);
  });

  it.each([
    { value: "sharp" as const, css: "0px" },
    { value: "minimal" as const, css: "1rem" },
    { value: "rounded" as const, css: "2rem" },
  ])("supports the $value corner style", ({ value, css }) => {
    expect(resolveCardDesign({ ...customCard, border_radius: value }).borderRadius).toBe(value);
    expect(cardRadius(value)).toBe(css);
  });

  it.each(FONT_OPTIONS)("uses the actual $label family", ({ value }) => {
    expect(resolveCardDesign({ ...customCard, font_family: value }).fontFamily).toBe(value);
    expect(cardFont(value)).toContain(`'${value}'`);
  });

  it("resolves all four Pro preset palettes as mode: custom", () => {
    for (const preset of DESIGN_PRESET_PALETTES) {
      const design = resolveCardDesign({
        ...customCard,
        bg_color: preset.bg_color,
        surface_color: preset.surface_color,
        accent_color: preset.accent_color,
        champagne_accent: preset.champagne_accent,
        text_color: preset.text_color,
      });

      expect(design.mode).toBe("custom");
      if (design.mode === "custom") {
        expect(design.bgColor).toBe(preset.bg_color);
        expect(design.surfaceColor).toBe(preset.surface_color);
        expect(design.accentColor).toBe(preset.accent_color);
        expect(design.champagneAccent).toBe(preset.champagne_accent);
        expect(design.textColor).toBe(preset.text_color);
      }
    }
  });

  it("resolves Ivory Atelier light palette correctly as mode: custom", () => {
    const ivory = DESIGN_PRESET_PALETTES.find((p) => p.id === "ivory_atelier")!;
    expect(ivory).toBeDefined();

    const design = resolveCardDesign({
      ...customCard,
      bg_color: ivory.bg_color,
      surface_color: ivory.surface_color,
      accent_color: ivory.accent_color,
      champagne_accent: ivory.champagne_accent,
      text_color: ivory.text_color,
    });

    expect(design.mode).toBe("custom");
    if (design.mode === "custom") {
      expect(design.bgColor).toBe("#F4F0E8");
      expect(design.surfaceColor).toBe("#FFFDF8");
      expect(design.accentColor).toBe("#1E3A32");
      expect(design.champagneAccent).toBe("#7A5A24");
      expect(design.textColor).toBe("#161A18");
      expect(design.onAccentColor).toBe("#FFFFFF"); // White text on dark green #1E3A32
    }
  });

  it("falls back to Classic V2 for invalid colors, enum values, and Free custom state", () => {
    expect(resolveCardDesign({ ...customCard, bg_color: "url(javascript:alert(1))" })).toEqual(
      CLASSIC_V2_DESIGN,
    );
    expect(resolveCardDesign({ ...customCard, surface_color: "#zzz" })).toEqual(CLASSIC_V2_DESIGN);
    expect(resolveCardDesign({ ...customCard, accent_color: "blue" })).toEqual(CLASSIC_V2_DESIGN);
    expect(
      resolveCardDesign({ ...customCard, header_pattern: "unknown" as Card["header_pattern"] }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(
      resolveCardDesign({ ...customCard, surface_finish: "unknown" as Card["surface_finish"] }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(
      resolveCardDesign({ ...customCard, border_radius: "unknown" as Card["border_radius"] }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(
      resolveCardDesign({ ...customCard, font_family: "unknown" as Card["font_family"] }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(resolveCardDesign({ ...customCard, plan_tier: "free" })).toEqual(CLASSIC_V2_DESIGN);
  });

  it("preserves user custom colors in preview without silent fallback, and flags contrast via warnings helper", () => {
    const lowContrastCard = {
      ...customCard,
      bg_color: "#121212",
      surface_color: "#121212",
      text_color: "#121212",
      champagne_accent: "#131313",
    };

    // Does not silently reset to Classic V2
    const design = resolveCardDesign(lowContrastCard);
    expect(design.mode).toBe("custom");
    if (design.mode === "custom") {
      expect(design.textColor).toBe("#121212");
      expect(design.surfaceColor).toBe("#121212");
    }

    // Reports contrast warnings for editor feedback
    const warnings = getPaletteContrastWarnings({
      textColor: lowContrastCard.text_color,
      bgColor: lowContrastCard.bg_color,
      surfaceColor: lowContrastCard.surface_color,
      accentColor: lowContrastCard.accent_color,
      champagneAccent: lowContrastCard.champagne_accent,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.pair === "Text on Surface")).toBe(true);
  });

  it("selects the higher-contrast black or white foreground for accent actions", () => {
    const lightAccent = resolveCardDesign({ ...customCard, accent_color: "#999999" });
    const darkAccent = resolveCardDesign({ ...customCard, accent_color: "#212223" });

    expect(lightAccent.mode).toBe("custom");
    expect(lightAccent.onAccentColor).toBe("#000000");
    expect(
      colorContrast(lightAccent.onAccentColor, lightAccent.accentColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(darkAccent.mode).toBe("custom");
    expect(darkAccent.onAccentColor).toBe("#FFFFFF");
    expect(colorContrast(darkAccent.onAccentColor, darkAccent.accentColor)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("keeps complete safe custom palettes and Classic V2 deterministic", () => {
    expect(resolveCardDesign(customCard).mode).toBe("custom");
    expect(resolveCardDesign({ ...customCard, plan_tier: "free" })).toEqual(CLASSIC_V2_DESIGN);
    expect(CLASSIC_V2_DESIGN.onAccentColor).toBe("#FFFFFF");
  });
});
