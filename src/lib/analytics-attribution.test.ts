import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260815030000_nfc_qr_attribution.sql", import.meta.url),
  "utf8",
);

describe("NFC / QR entry attribution", () => {
  it("stores only the three canonical page-view sources without a public source argument", () => {
    expect(migration).toContain("entry_source IN ('direct', 'profile_qr', 'permanent_tag')");
    expect(migration).toContain("event_type = 'page_view'");
    expect(migration).toContain("record_public_profile_qr_page_view");
    expect(migration).toContain("record_public_tag_page_view");

    const publicSignature = migration.match(
      /FUNCTION public\.record_public_card_event\(([\s\S]*?)\)\nRETURNS boolean/,
    )?.[1];
    expect(publicSignature).toBeTruthy();
    expect(publicSignature).not.toContain("source");
  });

  it("derives permanent-tag attribution from an active token and keeps retry deduplication", () => {
    expect(migration).toContain("WHERE tag.token = _token");
    expect(migration).toContain("tag.status = 'active'");
    expect(migration).toContain("card.is_active IS true");
    expect(migration).toContain("ON CONFLICT (card_id, event_id)");
    expect(migration).not.toMatch(/nfc_scan|qr_scan/);
  });

  it("keeps the three QR products distinct and the vCard payload offline", () => {
    const qr = readFileSync(new URL("../components/dashboard/QrTab.tsx", import.meta.url), "utf8");
    expect(qr).toContain("/c/${card.slug}?jt_entry=profile_qr");
    expect(qr).toContain("/t/${permanentToken}");
    expect(qr).toContain("const offlineVCardData = buildVCard(card)");
    expect(qr).toContain("QRCode.toDataURL(offlineVCardData");
  });

  it("records the tag entry before redirect and suppresses the duplicate client page view", () => {
    const tagRoute = readFileSync(new URL("../routes/t.$token.tsx", import.meta.url), "utf8");
    const cardView = readFileSync(
      new URL("../components/card/CardView.tsx", import.meta.url),
      "utf8",
    );
    expect(tagRoute).toContain("await recordPermanentTagPageViewFromSupabase(token)");
    expect(tagRoute).toContain('attributed ? { jt_entry: "permanent_tag" } : {}');
    expect(cardView).toContain('entrySource === "permanent_tag"');
  });

  it("is additive and preserves analytics, NFC identity, and access controls", () => {
    expect(migration).not.toMatch(
      /DROP\s+SCHEMA|TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.nfc_tags/i,
    );
    expect(migration).not.toMatch(/ALTER\s+TABLE\s+public\.nfc_tags/i);
    expect(migration).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE).*card_analytics/i);
  });
});
