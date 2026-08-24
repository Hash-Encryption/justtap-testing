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
