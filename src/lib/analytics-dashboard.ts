export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All",
};

export const ANALYTICS_ACTION_LABELS = {
  vcard_download: "Contact Saves",
  connection_submit: "Connections",
} as const;

export const ANALYTICS_SOURCE_LABELS = {
  direct: "Direct",
  profile_qr: "Profile QR",
  permanent_tag: "Permanent Tag",
} as const;

export type AnalyticsDashboardData = {
  range: AnalyticsRange;
  trend_granularity: "day" | "month";
  trend_label: string;
  metrics: {
    profile_views: number;
    contact_saves: number;
    connections: number;
    conversion_rate: number;
  };
  trend: Array<{
    period: string;
    profile_views: number;
    contact_saves: number;
    connections: number;
  }>;
  top_actions: Array<{ action: keyof typeof ANALYTICS_ACTION_LABELS; count: number }>;
  traffic_sources: Array<{ source: keyof typeof ANALYTICS_SOURCE_LABELS; count: number }>;
};

export function isAnalyticsDashboardData(value: unknown): value is AnalyticsDashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyticsDashboardData>;
  return (
    ANALYTICS_RANGES.includes(data.range as AnalyticsRange) &&
    (data.trend_granularity === "day" || data.trend_granularity === "month") &&
    typeof data.trend_label === "string" &&
    Boolean(data.metrics) &&
    typeof data.metrics?.profile_views === "number" &&
    typeof data.metrics?.contact_saves === "number" &&
    typeof data.metrics?.connections === "number" &&
    typeof data.metrics?.conversion_rate === "number" &&
    Array.isArray(data.trend) &&
    Array.isArray(data.top_actions) &&
    Array.isArray(data.traffic_sources)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Sample Analytics Data (Pro Preview)
// Fixed, immutable data points — zero runtime timestamp or randomness dependency
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_7D_TREND = [
  { period: "2026-08-18", profile_views: 18, contact_saves: 4, connections: 2 },
  { period: "2026-08-19", profile_views: 22, contact_saves: 5, connections: 2 },
  { period: "2026-08-20", profile_views: 31, contact_saves: 7, connections: 3 },
  { period: "2026-08-21", profile_views: 45, contact_saves: 9, connections: 4 },
  { period: "2026-08-22", profile_views: 38, contact_saves: 8, connections: 3 },
  { period: "2026-08-23", profile_views: 52, contact_saves: 11, connections: 5 },
  { period: "2026-08-24", profile_views: 40, contact_saves: 8, connections: 3 },
];

const SAMPLE_30D_DATES = [
  "2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31",
  "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06",
  "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12",
  "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18",
  "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24",
];

const SAMPLE_30D_FACTORS = [
  [14, 3, 1], [16, 3, 1], [19, 4, 2], [22, 5, 2], [20, 4, 2], [25, 5, 2],
  [28, 6, 3], [24, 5, 2], [30, 6, 3], [32, 7, 3], [27, 6, 2], [35, 7, 3],
  [38, 8, 3], [33, 7, 3], [42, 9, 4], [40, 8, 3], [46, 10, 4], [43, 9, 4],
  [39, 8, 3], [48, 10, 4], [51, 11, 4], [47, 10, 4], [55, 12, 5], [18, 4, 2],
  [22, 5, 2], [31, 7, 3], [45, 9, 4], [38, 8, 3], [52, 11, 5], [40, 8, 3],
] as const;

const SAMPLE_30D_TREND = SAMPLE_30D_DATES.map((period, i) => {
  const f = SAMPLE_30D_FACTORS[i] ?? [20, 4, 2];
  return { period, profile_views: f[0], contact_saves: f[1], connections: f[2] };
});

const SAMPLE_90D_TREND = Array.from({ length: 90 }, (_, i) => {
  // Generate 90 fixed deterministic dates from 2026-05-27 to 2026-08-24
  const startUtc = new Date(Date.UTC(2026, 4, 27)).getTime();
  const dayMs = 86_400_000;
  const d = new Date(startUtc + i * dayMs);
  const period = d.toISOString().slice(0, 10);
  const cycle = i % 7;
  const growth = Math.floor(i / 10);
  const views = 15 + cycle * 4 + growth * 2;
  const saves = Math.round(views * 0.22);
  const connections = Math.round(views * 0.09);
  return { period, profile_views: views, contact_saves: saves, connections };
});

const SAMPLE_ALL_TREND = [
  { period: "2025-09", profile_views: 420, contact_saves: 88, connections: 37 },
  { period: "2025-10", profile_views: 490, contact_saves: 102, connections: 44 },
  { period: "2025-11", profile_views: 580, contact_saves: 122, connections: 52 },
  { period: "2025-12", profile_views: 640, contact_saves: 135, connections: 58 },
  { period: "2026-01", profile_views: 710, contact_saves: 148, connections: 63 },
  { period: "2026-02", profile_views: 680, contact_saves: 142, connections: 60 },
  { period: "2026-03", profile_views: 790, contact_saves: 165, connections: 70 },
  { period: "2026-04", profile_views: 860, contact_saves: 180, connections: 76 },
  { period: "2026-05", profile_views: 920, contact_saves: 192, connections: 81 },
  { period: "2026-06", profile_views: 1040, contact_saves: 218, connections: 92 },
  { period: "2026-07", profile_views: 1120, contact_saves: 234, connections: 99 },
  { period: "2026-08", profile_views: 1180, contact_saves: 246, connections: 104 },
];

function buildSampleDataset(
  range: AnalyticsRange,
  trend_granularity: "day" | "month",
  trend_label: string,
  trend: Array<{ period: string; profile_views: number; contact_saves: number; connections: number }>,
  sourceProportions = { permanent_tag: 0.52, profile_qr: 0.3, direct: 0.18 },
): AnalyticsDashboardData {
  const profile_views = trend.reduce((sum, p) => sum + p.profile_views, 0);
  const contact_saves = trend.reduce((sum, p) => sum + p.contact_saves, 0);
  const connections = trend.reduce((sum, p) => sum + p.connections, 0);
  const conversion_rate =
    profile_views > 0 ? Math.round((connections / profile_views) * 1000) / 10 : 0;

  const permanentTagCount = Math.round(profile_views * sourceProportions.permanent_tag);
  const profileQrCount = Math.round(profile_views * sourceProportions.profile_qr);
  const directCount = Math.max(0, profile_views - permanentTagCount - profileQrCount);

  return {
    range,
    trend_granularity,
    trend_label,
    metrics: {
      profile_views,
      contact_saves,
      connections,
      conversion_rate,
    },
    trend,
    top_actions: [
      { action: "vcard_download", count: contact_saves },
      { action: "connection_submit", count: connections },
    ],
    traffic_sources: [
      { source: "permanent_tag", count: permanentTagCount },
      { source: "profile_qr", count: profileQrCount },
      { source: "direct", count: directCount },
    ],
  };
}

const SAMPLE_DATA_MAP: Record<AnalyticsRange, AnalyticsDashboardData> = {
  "7d": buildSampleDataset(
    "7d",
    "day",
    "Daily activity for the last 7 UTC days",
    SAMPLE_7D_TREND,
  ),
  "30d": buildSampleDataset(
    "30d",
    "day",
    "Daily activity for the last 30 UTC days",
    SAMPLE_30D_TREND,
  ),
  "90d": buildSampleDataset(
    "90d",
    "day",
    "Daily activity for the last 90 UTC days",
    SAMPLE_90D_TREND,
  ),
  all: buildSampleDataset(
    "all",
    "month",
    "Latest 12 calendar months (all-time totals above)",
    SAMPLE_ALL_TREND,
  ),
};

export function getSampleAnalyticsData(range: AnalyticsRange = "7d"): AnalyticsDashboardData {
  return SAMPLE_DATA_MAP[range] ?? SAMPLE_DATA_MAP["7d"];
}
