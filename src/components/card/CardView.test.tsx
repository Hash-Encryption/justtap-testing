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
});
