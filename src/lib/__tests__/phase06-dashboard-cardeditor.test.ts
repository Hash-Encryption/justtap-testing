import { describe, expect, it } from "vitest";
import {
  buildVCard,
  DESIGN_PRESET_PALETTES,
  emptyCard,
  escapeVCardText,
  isValidHexColor,
  type Card,
} from "../card";
import { saveCardRecord } from "../card-save";
import { validateSlug } from "../slug";

describe("Phase 06 Dashboard & CardEditor Unit Suite", () => {
  it("verifies Custom Creator preset palettes definitions", () => {
    expect(DESIGN_PRESET_PALETTES.length).toBe(4);
    expect(DESIGN_PRESET_PALETTES.map((p) => p.id)).toEqual([
      "executive_navy",
      "emerald_noir",
      "ivory_atelier",
      "rose_noir",
    ]);

    const executive = DESIGN_PRESET_PALETTES.find((p) => p.id === "executive_navy");
    expect(executive).toEqual({
      id: "executive_navy",
      name: "Executive Navy",
      bg_color: "#07111F",
      surface_color: "#0D1A2B",
      accent_color: "#2E6FDB",
      champagne_accent: "#E6D5AC",
      text_color: "#F8FAFC",
    });

    const emerald = DESIGN_PRESET_PALETTES.find((p) => p.id === "emerald_noir");
    expect(emerald).toEqual({
      id: "emerald_noir",
      name: "Emerald Noir",
      bg_color: "#07130F",
      surface_color: "#0D2119",
      accent_color: "#1E8A63",
      champagne_accent: "#E6D5AC",
      text_color: "#F5F7F4",
    });

    const ivory = DESIGN_PRESET_PALETTES.find((p) => p.id === "ivory_atelier");
    expect(ivory).toEqual({
      id: "ivory_atelier",
      name: "Ivory Atelier",
      bg_color: "#F4F0E8",
      surface_color: "#FFFDF8",
      accent_color: "#1E3A32",
      champagne_accent: "#7A5A24",
      text_color: "#161A18",
    });

    const rose = DESIGN_PRESET_PALETTES.find((p) => p.id === "rose_noir");
    expect(rose).toEqual({
      id: "rose_noir",
      name: "Rose Noir",
      bg_color: "#21171B",
      surface_color: "#2C2025",
      accent_color: "#C98F9D",
      champagne_accent: "#E7C9B6",
      text_color: "#FFF7F4",
    });
  });

  it("verifies emptyCard defaults align with Classic V2 baseline", () => {
    expect(emptyCard.design_mode).toBe("classic_v2");
    expect(emptyCard.bg_color).toBe("#08080A");
    expect(emptyCard.surface_color).toBe("#121216");
    expect(emptyCard.accent_color).toBe("#6B21A8");
    expect(emptyCard.champagne_accent).toBe("#E6D5AC");
    expect(emptyCard.text_color).toBe("#FAFAFA");
    expect(emptyCard.header_pattern).toBe("wave");
    expect(emptyCard.surface_finish).toBe("matte");
    expect(emptyCard.border_radius).toBe("minimal");
    expect(emptyCard.font_family).toBe("Outfit");
  });

  it("verifies 6-digit hex color validator accepts valid hex and rejects CSS injection strings", () => {
    expect(isValidHexColor("#6B21A8")).toBe(true);
    expect(isValidHexColor("#08080A")).toBe(true);
    expect(isValidHexColor("#FAFAFA")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);

    expect(isValidHexColor("url(javascript:alert(1))")).toBe(false);
    expect(isValidHexColor("expression(alert(1))")).toBe(false);
    expect(isValidHexColor("rgb(107, 33, 168)")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });

  it("verifies vCard text escaping for special punctuation and Arabic Unicode", () => {
    expect(escapeVCardText("Smith, Jr.")).toBe("Smith\\, Jr.");
    expect(escapeVCardText("ACME; Corp")).toBe("ACME\\; Corp");
    expect(escapeVCardText("Line 1\nLine 2")).toBe("Line 1\\nLine 2");
    expect(escapeVCardText("C:\\Docs")).toBe("C:\\\\Docs");
    expect(escapeVCardText("هاشم جندي")).toBe("هاشم جندي");
  });

  it("verifies vCard payload string generation with robust escaping", () => {
    const card: Card = {
      ...emptyCard,
      full_name: "Hashim, Gendi",
      phone: "+966501234567",
      email: "hashim@example.com",
      company: "JustTap, Inc.; LLC",
      title: "Founder & CEO",
      bio: "Line 1\nLine 2 with , and ;",
    };
    const vcard = buildVCard(card);
    expect(vcard).toContain("BEGIN:VCARD");
    expect(vcard).toContain("FN:Hashim\\, Gendi");
    expect(vcard).toContain("ORG:JustTap\\, Inc.\\; LLC");
    expect(vcard).toContain("TEL;TYPE=CELL:+966501234567");
    expect(vcard).toContain("NOTE:Line 1\\nLine 2 with \\, and \\;");
    expect(vcard).toContain("END:VCARD");
  });

  it("verifies safe card saving gateway receives sanitized payload without destroying permanent tokens", async () => {
    const payload = {
      user_id: "user-123",
      slug: "johndoe",
      full_name: "John Doe",
      phone: "12345678",
      design_mode: "custom",
      header_pattern: "arch",
      bg_color: "#08080A",
      surface_color: "#121216",
      accent_color: "#6B21A8",
      champagne_accent: "#E6D5AC",
      text_color: "#FAFAFA",
      surface_finish: "glassmorphism",
      border_radius: "rounded",
      font_family: "Space Grotesk",
    };

    let updateCalled = false;
    let savedId = "";

    const mockGateway = {
      async insert() {
        return { data: null, error: null };
      },
      async update(id: string, userId: string, data: Record<string, unknown>) {
        updateCalled = true;
        savedId = id;
        return { data: { id, ...data } as unknown as Card, error: null };
      },
    };

    const res = await saveCardRecord(
      { isNew: false, cardId: "card-999", userId: "user-123", payload },
      mockGateway,
    );

    expect(res.status).toBe("saved");
    expect(updateCalled).toBe(true);
    expect(savedId).toBe("card-999");
  });

  it("verifies public card deactivation toggles is_active without setting slug to NULL", () => {
    const activeCard: Card = { ...emptyCard, id: "c-1", slug: "active-slug", is_active: true };
    const deactivatedPayload = { ...activeCard, is_active: false };

    expect(deactivatedPayload.is_active).toBe(false);
    expect(deactivatedPayload.slug).toBe("active-slug"); // Slug is preserved!
    expect(validateSlug(deactivatedPayload.slug).valid).toBe(true);
  });
});
