import { describe, expect, it } from "vitest";
import { colorContrast, emptyCard, FINISHES, FONT_OPTIONS, PATTERNS, type Card } from "./card";
import { CLASSIC_V2_DESIGN, cardFont, cardRadius, resolveCardDesign } from "./card-design";

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

describe("Phase 07 shared card design", () => {
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

  it("falls back for invalid colors, enum values, and Free custom state", () => {
    expect(resolveCardDesign({ ...customCard, bg_color: "url(javascript:alert(1))" })).toEqual(
      CLASSIC_V2_DESIGN,
    );
    expect(
      resolveCardDesign({ ...customCard, header_pattern: "unknown" as Card["header_pattern"] }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(resolveCardDesign({ ...customCard, plan_tier: "free" })).toEqual(CLASSIC_V2_DESIGN);
  });

  it("falls back when primary text matches or barely differs from its backgrounds", () => {
    expect(
      resolveCardDesign({
        ...customCard,
        bg_color: "#121212",
        surface_color: "#121212",
        text_color: "#121212",
      }),
    ).toEqual(CLASSIC_V2_DESIGN);
    expect(
      resolveCardDesign({
        ...customCard,
        bg_color: "#101010",
        surface_color: "#111111",
        text_color: "#222222",
      }),
    ).toEqual(CLASSIC_V2_DESIGN);
  });

  it("accepts high contrast palettes and checks the composited glass surface", () => {
    expect(resolveCardDesign(customCard).mode).toBe("custom");
    expect(
      resolveCardDesign({
        ...customCard,
        bg_color: "#FFFFFF",
        surface_color: "#FFFFFF",
        text_color: "#EEEEEE",
        surface_finish: "glassmorphism",
      }),
    ).toEqual(CLASSIC_V2_DESIGN);
  });

  it("falls back when Champagne content is unreadable on the rendered surfaces", () => {
    expect(resolveCardDesign({ ...customCard, champagne_accent: "#111213" })).toEqual(
      CLASSIC_V2_DESIGN,
    );
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
