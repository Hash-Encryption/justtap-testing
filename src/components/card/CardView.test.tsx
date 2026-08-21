import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { colorContrast, emptyCard, type Card } from "@/lib/card";
import { resolveCardDesign } from "@/lib/card-design";
import { CardView } from "./CardView";

const actionCard: Card = {
  ...emptyCard,
  id: "card-actions",
  slug: "action-card",
  full_name: "Action Card",
  phone: "+966501234567",
  email: "person@example.com",
  whatsapp_phone: "+966501234567",
  social_links: { linkedin: "https://www.linkedin.com/in/action-card" },
  plan_tier: "pro",
  pro_features: {
    video_url: "https://www.youtube.com/watch?v=kzfvVizScuU",
    booking_url: "https://cal.example.com/action-card",
    pdf_url: "https://files.example.com/profile.pdf",
    custom_cta_label: "Visit profile",
    custom_cta_url: "https://example.com/action-card",
  },
};

describe("CardView action isolation", () => {
  it("renders every outbound preview action without an actionable URL", () => {
    const html = renderToStaticMarkup(<CardView card={actionCard} preview />);

    expect(html).not.toContain("href=");
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube.com/embed");
    expect(html).toContain("data-video-preview-placeholder");
    expect(html).toContain("Video on published card");
    expect(html).toContain("grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]");
  });

  it("keeps public telephone, email, social, Pro, and WhatsApp actions functional", () => {
    const html = renderToStaticMarkup(<CardView card={actionCard} />);

    expect(html).toContain('href="tel:+966501234567"');
    expect(html).toContain('href="mailto:person@example.com"');
    expect(html).toContain('href="https://www.linkedin.com/in/action-card"');
    expect(html).toContain('href="https://cal.example.com/action-card"');
    expect(html).toContain('href="https://files.example.com/profile.pdf"');
    expect(html).toContain('href="https://example.com/action-card"');
    expect(html).toContain('href="https://wa.me/966501234567?text=');
    expect(html).toContain("<iframe");
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/kzfvVizScuU"');
    expect(html).not.toContain("data-video-preview-placeholder");
  });

  it("does not render saved Pro blocks when the database boundary denies entitlement", () => {
    const html = renderToStaticMarkup(
      <CardView
        card={{
          ...actionCard,
          plan_tier: "free",
        }}
      />,
    );

    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie.com");
    expect(html).not.toContain("https://cal.example.com/action-card");
  });

  it("uses the resolver-selected foreground for booking and primary actions", () => {
    const html = renderToStaticMarkup(
      <CardView
        card={{
          ...actionCard,
          design_mode: "custom",
          bg_color: "#010203",
          surface_color: "#111213",
          accent_color: "#999999",
          champagne_accent: "#D1D2D3",
          text_color: "#F1F2F3",
        }}
      />,
    );

    expect(html).toContain("background-color:#999999;color:#000000");
    expect(html).toContain("Book Meeting");
  });

  it("renders borderline passing text without reducing its validated opacity", () => {
    const borderlineCard: Card = {
      ...actionCard,
      company: "Borderline Company",
      bio: "Borderline biography",
      design_mode: "custom",
      bg_color: "#000000",
      surface_color: "#000000",
      accent_color: "#000000",
      champagne_accent: "#FFFFFF",
      text_color: "#7D7D7D",
    };
    const design = resolveCardDesign(borderlineCard);
    const html = renderToStaticMarkup(<CardView card={borderlineCard} />);

    expect(design.mode).toBe("custom");
    expect(colorContrast("#7D7D7D", "#000000")).toBeGreaterThanOrEqual(4.5);
    expect(html).toContain("Borderline Company");
    expect(html).toContain("Borderline biography");
    expect(html).toContain("Powered by");
    expect(html).not.toMatch(/opacity-(?:50|75|80|85|90)/);
  });

  it("renders all four Pro presets correctly in preview and public modes", () => {
    const presets = [
      {
        id: "executive_navy",
        bg_color: "#07111F",
        surface_color: "#0D1A2B",
        accent_color: "#2E6FDB",
        champagne_accent: "#E6D5AC",
        text_color: "#F8FAFC",
      },
      {
        id: "emerald_noir",
        bg_color: "#07130F",
        surface_color: "#0D2119",
        accent_color: "#1E8A63",
        champagne_accent: "#E6D5AC",
        text_color: "#F5F7F4",
      },
      {
        id: "ivory_atelier",
        bg_color: "#F4F0E8",
        surface_color: "#FFFDF8",
        accent_color: "#1E3A32",
        champagne_accent: "#7A5A24",
        text_color: "#161A18",
      },
      {
        id: "rose_noir",
        bg_color: "#21171B",
        surface_color: "#2C2025",
        accent_color: "#C98F9D",
        champagne_accent: "#E7C9B6",
        text_color: "#FFF7F4",
      },
    ];

    for (const p of presets) {
      const card: Card = {
        ...actionCard,
        design_mode: "custom",
        ...p,
      };

      const previewHtml = renderToStaticMarkup(<CardView card={card} preview />);
      expect(previewHtml).toContain(`data-card-design="custom"`);
      expect(previewHtml).toContain(`background-color:${p.bg_color}`);

      const publicHtml = renderToStaticMarkup(<CardView card={card} />);
      expect(publicHtml).toContain(`data-card-design="custom"`);
      expect(publicHtml).toContain(`background-color:${p.bg_color}`);
    }
  });

  it("renders Ivory Atelier light palette with readable contrast and dark accent buttons", () => {
    const ivoryCard: Card = {
      ...actionCard,
      design_mode: "custom",
      bg_color: "#F4F0E8",
      surface_color: "#FFFDF8",
      accent_color: "#1E3A32",
      champagne_accent: "#7A5A24",
      text_color: "#161A18",
    };

    const design = resolveCardDesign(ivoryCard);
    expect(design.mode).toBe("custom");
    expect(design.onAccentColor).toBe("#FFFFFF");

    const html = renderToStaticMarkup(<CardView card={ivoryCard} />);
    expect(html).toContain(`data-card-design="custom"`);
    expect(html).toContain(`background-color:#F4F0E8`);
    expect(html).toContain(`color:#161A18`);
    expect(html).toContain(`background-color:#1E3A32;color:#FFFFFF`);
  });

  it("enforces Classic V2 publicly when plan_tier is free even if custom fields exist", () => {
    const freeWithCustom: Card = {
      ...actionCard,
      plan_tier: "free",
      design_mode: "custom",
      bg_color: "#07111F",
      surface_color: "#0D1A2B",
      accent_color: "#2E6FDB",
      champagne_accent: "#E6D5AC",
      text_color: "#F8FAFC",
    };

    const design = resolveCardDesign(freeWithCustom);
    expect(design.mode).toBe("classic_v2");
    expect(design.bgColor).toBe("#08080A");
    expect(design.accentColor).toBe("#6B21A8");

    const html = renderToStaticMarkup(<CardView card={freeWithCustom} />);
    expect(html).toContain(`data-card-design="classic_v2"`);
    expect(html).toContain(`background-color:#08080A`);
  });
});
