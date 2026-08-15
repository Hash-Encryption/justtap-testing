import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENT_TYPES,
  getAnalyticsSessionId,
  getPublicCardEntrySource,
  getPublicAnalyticsMetadata,
} from "./analytics";

describe("analytics event pipeline", () => {
  it("defines the canonical current and future event taxonomy", () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual([
      "page_view",
      "vcard_download",
      "phone_click",
      "email_click",
      "whatsapp_click",
      "social_click",
      "website_click",
      "share",
      "booking_click",
      "custom_cta_click",
      "pdf_download",
      "video_play",
      "wallet_add",
      "connection_submit",
    ]);
  });

  it("uses one random per-tab session identifier and replaces malformed state", () => {
    const values = new Map<string, string>();
    const store = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    values.set("justtap.analytics.session.v1", "not-an-id");
    const first = getAnalyticsSessionId(store);
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getAnalyticsSessionId(store)).toBe(first);
  });

  it("retains only hostname and coarse device category", () => {
    expect(getPublicAnalyticsMetadata("https://example.com/private/path?q=secret", 390)).toEqual({
      referrer_host: "example.com",
      device_category: "mobile",
    });
    expect(getPublicAnalyticsMetadata("invalid", 900)).toEqual({ device_category: "tablet" });
    expect(getPublicAnalyticsMetadata("", 1440)).toEqual({ device_category: "desktop" });
  });

  it("accepts only the two controlled entry markers and defaults everything else to direct", () => {
    expect(getPublicCardEntrySource("")).toBe("direct");
    expect(getPublicCardEntrySource("?jt_entry=profile_qr")).toBe("profile_qr");
    expect(getPublicCardEntrySource("?jt_entry=permanent_tag")).toBe("permanent_tag");
    expect(getPublicCardEntrySource("?jt_entry=nfc")).toBe("direct");
    expect(getPublicCardEntrySource("?source=profile_qr")).toBe("direct");
  });

  it("routes public tracking through the narrow RPC without direct table inserts", () => {
    const renderer = readFileSync(
      new URL("../components/card/CardView.tsx", import.meta.url),
      "utf8",
    );
    const vcard = readFileSync(new URL("../routes/api/vcard.$slug.ts", import.meta.url), "utf8");
    const migration = readFileSync(
      new URL(
        "../../supabase/migrations/20260815020000_analytics_event_pipeline.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(renderer).toContain('trackPublicCardEvent(card.slug, "page_view"');
    expect(renderer).not.toContain('from("card_analytics").insert');
    expect(vcard).toContain('rpc("record_public_card_event"');
    expect(vcard).not.toContain('from("card_analytics").insert');
    expect(migration).toContain("REVOKE ALL ON TABLE public.card_analytics FROM anon");
    expect(migration).toContain("ON CONFLICT (card_id, event_id)");
    expect(migration).not.toMatch(/DROP\s+SCHEMA|TRUNCATE|DELETE\s+FROM\s+public\.card_analytics/i);
  });
});
