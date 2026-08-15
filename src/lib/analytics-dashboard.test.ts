import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_ACTION_LABELS,
  ANALYTICS_RANGES,
  ANALYTICS_SOURCE_LABELS,
  isAnalyticsDashboardData,
} from "./analytics-dashboard";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260815040000_analytics_functional_ui.sql", import.meta.url),
  "utf8",
);
const ui = readFileSync(
  new URL("../components/dashboard/AnalyticsTab.tsx", import.meta.url),
  "utf8",
);
const dashboard = readFileSync(new URL("../routes/dashboard.tsx", import.meta.url), "utf8");

describe("owner analytics dashboard", () => {
  it("keeps the product ranges, emitted actions, and attributed sources exact", () => {
    expect(ANALYTICS_RANGES).toEqual(["7d", "30d", "90d", "all"]);
    expect(ANALYTICS_ACTION_LABELS).toEqual({
      vcard_download: "Contact Saves",
      connection_submit: "Connections",
    });
    expect(ANALYTICS_SOURCE_LABELS).toEqual({
      direct: "Direct",
      profile_qr: "Profile QR",
      permanent_tag: "Permanent Tag",
    });
  });

  it("accepts only the aggregate response shape used by the UI", () => {
    expect(
      isAnalyticsDashboardData({
        range: "7d",
        trend_granularity: "day",
        trend_label: "Daily activity for the last 7 UTC days",
        metrics: {
          profile_views: 0,
          contact_saves: 0,
          connections: 0,
          conversion_rate: 0,
        },
        trend: [],
        top_actions: [],
        traffic_sources: [],
      }),
    ).toBe(true);
    expect(isAnalyticsDashboardData({ range: "week", metrics: {} })).toBe(false);
  });

  it("enforces authentication, ownership, authoritative entitlement, and safe errors", () => {
    expect(migration).toContain("_owner_id uuid := auth.uid()");
    expect(migration).toContain("_range IS NULL OR _range NOT IN ('7d', '30d', '90d', 'all')");
    expect(migration).toContain("card.user_id = _owner_id");
    expect(migration).toContain("profile.plan_tier IN ('pro', 'enterprise')");
    expect(migration.match(/Analytics unavailable/g)).toHaveLength(2);
    expect(migration).toContain("errcode = '42501'");
    expect(migration).toContain("errcode = '22023'");
  });

  it("computes honest UTC aggregates, conversion, and bounded all-time trend", () => {
    expect(migration).toContain("now() AT TIME ZONE 'UTC'");
    expect(migration).toContain("nullif(totals.profile_views, 0)");
    expect(migration).toContain("round(totals.connections::numeric");
    expect(migration).toContain("interval '11 months'");
    expect(migration).toContain("Latest 12 calendar months (all-time totals above)");
    expect(migration).toContain("generate_series(");
    expect(migration).toContain("entry_source IN ('direct', 'profile_qr', 'permanent_tag')");
    expect(migration).not.toMatch(/coalesce\(entry_source,\s*'direct'\)/i);
    expect(migration).toContain("ORDER BY total DESC, sort_order");
  });

  it("returns only small aggregate keys and grants only authenticated execution", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_owner_card_analytics(uuid, text) FROM public",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_owner_card_analytics(uuid, text) FROM anon",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_owner_card_analytics(uuid, text) TO authenticated",
    );
    expect(migration).not.toMatch(/GRANT EXECUTE[^;]+TO anon/i);
    expect(migration).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]+card_analytics/i);
    expect(migration).not.toMatch(
      /jsonb_build_object\([^)]*event_id|jsonb_build_object\([^)]*session_id|jsonb_build_object\([^)]*metadata|referrer_host/i,
    );
  });

  it("keeps admin raw metrics while restricting owner SELECT to database Pro entitlement", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "owners read their analytics"');
    expect(migration).toContain("public.has_role(auth.uid(), 'admin')");
    expect(migration).toContain("card.id = card_analytics.card_id");
    expect(migration).not.toMatch(/DROP POLICY[^;]+delete their analytics/i);
  });

  it("wires locked, loading, empty, error/retry, chart, fallback, and card isolation", () => {
    expect(ui).toContain("if (!isPro)");
    expect(ui.indexOf("if (!isPro)")).toBeLessThan(ui.indexOf('.rpc("get_owner_card_analytics"'));
    expect(ui).toContain("Loading analytics…");
    expect(ui).toContain("No activity in this range");
    expect(ui).toContain("Analytics couldn&apos;t be loaded.");
    expect(ui).toContain("Try again");
    expect(ui).toContain("<LineChart");
    expect(ui).toContain("View trend data table");
    expect(ui).toContain("aria-pressed={range === value}");
    expect(ui).not.toContain('.from("card_analytics")');
    expect(dashboard).toContain("key={selectedCard.id}");
    expect(dashboard).toContain("isPro={selectedCard.plan_tier");
  });
});
