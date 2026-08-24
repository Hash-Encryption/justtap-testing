import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Download,
  Eye,
  Globe,
  Loader2,
  LockKeyhole,
  Percent,
  QrCode,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ANALYTICS_RANGES,
  getSampleAnalyticsData,
  isAnalyticsDashboardData,
  type AnalyticsDashboardData,
  type AnalyticsRange,
} from "@/lib/analytics-dashboard";
import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/sanitization";
import {
  formatLocalizedPeakDate,
  formatLocalizedRelativeTime,
  useTranslation,
  type Translations,
} from "@/lib/i18n";
import type { Connection, ConnectionStatus } from "@/lib/connections";
import type { Session } from "@supabase/supabase-js";
import { ProUpgradeDialog } from "./ProUpgradeDialog";

const DISPLAY_RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  all: "All",
};

const PRESENTATION_SOURCE_KEYS: Record<
  string,
  { key: "sourceLink" | "sourceProfileQr" | "sourceJustTapCard"; icon: typeof Globe }
> = {
  direct: { key: "sourceLink", icon: Globe },
  profile_qr: { key: "sourceProfileQr", icon: QrCode },
  permanent_tag: { key: "sourceJustTapCard", icon: CreditCard },
};

const SOURCE_COLORS: Record<string, string> = {
  direct: "#a855f7", // Royal Purple
  profile_qr: "#e6d5ac", // Champagne
  permanent_tag: "#38bdf8", // Sky
};

const STATUS_BADGE_STYLES: Record<ConnectionStatus, string> = {
  new: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  follow_up: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  contacted: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  done: "bg-slate-800 text-slate-400 border-slate-700",
};

const CANONICAL_ACTION_I18N_KEYS: Record<string, string> = {
  vcard_download: "actionVcard",
  connection_submit: "actionConnection",
  phone_click: "actionPhone",
  email_click: "actionEmail",
  whatsapp_click: "actionWhatsapp",
  social_click: "actionSocial",
  website_click: "actionWebsite",
  share: "actionShare",
  booking_click: "actionBooking",
  custom_cta_click: "actionCustomCta",
  pdf_download: "actionPdf",
  video_play: "actionVideo",
  wallet_add: "actionWallet",
};

export function AnalyticsTab({
  cardId,
  isPro,
  cards,
  onSelectCardId,
  onNavigateToConnections,
  session,
  onTrialStarted,
}: {
  cardId: string;
  isPro: boolean;
  cards?: { id: string; full_name?: string | null; slug?: string | null }[];
  onSelectCardId?: (id: string) => void;
  onNavigateToConnections?: () => void;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AnalyticsDashboardData | null>(() =>
    !isPro ? getSampleAnalyticsData("7d") : null,
  );
  const [loading, setLoading] = useState(isPro);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!isPro) {
      setData(getSampleAnalyticsData(range));
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);
    setError(false);

    supabase
      .rpc("get_owner_card_analytics", { _card_id: cardId, _range: range })
      .then(({ data: response, error: loadError }) => {
        if (cancelled) return;
        if (loadError || !isAnalyticsDashboardData(response)) {
          setError(true);
        } else {
          setData(response);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, isPro, range, reload]);

  return (
    <div className="space-y-6">
      {/* PRO PREVIEW · SAMPLE DATA BANNER */}
      {!isPro && (
        <div
          data-testid="analytics-pro-preview-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <span
              data-testid="analytics-pro-preview-badge"
              className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300"
            >
              {t("analyticsPreviewBadge")}
            </span>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {t("analyticsPreviewDesc")}
            </p>
          </div>

          <button
            type="button"
            data-testid="analytics-unlock-cta"
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex min-h-9 items-center justify-center gap-2 self-start sm:self-auto shrink-0 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-amber-500 px-4 text-xs font-bold text-white shadow-md shadow-purple-900/30 transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("unlockAnalytics")}</span>
          </button>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {t("analyticsTitle")}
          </h1>
          <p className="mt-1 text-xs text-slate-400">{t("analyticsSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {cards && cards.length > 1 && onSelectCardId && (
            <select
              value={cardId}
              onChange={(e) => onSelectCardId(e.target.value)}
              className="h-9 rounded-xl border border-slate-800 bg-[#121216] px-3 text-xs font-semibold text-slate-200 focus:border-purple-500 focus:outline-none"
              aria-label={t("selectCardAria")}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || `/c/${c.slug}`}
                </option>
              ))}
            </select>
          )}

          {/* DATE RANGE SEGMENTED CONTROL */}
          <div
            role="group"
            aria-label={t("analyticsDateRangeAria")}
            className="inline-flex items-center rounded-2xl border border-slate-800 bg-[#121216] p-1 shadow-inner"
          >
            {ANALYTICS_RANGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`min-h-8 rounded-xl px-3.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  range === value
                    ? "bg-purple-700 text-white shadow-md shadow-purple-900/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {value === "all" ? t("rangeAll") : DISPLAY_RANGE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div
          role="status"
          className="grid min-h-72 place-items-center rounded-3xl border border-slate-800/80 justtap-glass p-8 text-sm text-slate-400"
        >
          <span className="inline-flex items-center gap-2.5 font-medium text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> {t("loadingAnalytics")}
          </span>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div role="alert" className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
          <p className="font-display text-base font-semibold text-white">
            {t("analyticsErrorTitle")}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">{t("analyticsErrorDesc")}</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> {t("tryAgain")}
          </button>
        </div>
      )}

      {/* POPULATED CONTENT */}
      {!loading && !error && data && (
        <AnalyticsContent
          data={data}
          cardId={cardId}
          onNavigateToConnections={onNavigateToConnections}
        />
      )}

      {/* SHARED PRO UPGRADE DIALOG */}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        source="analytics_unlock"
        session={session}
        onTrialStarted={onTrialStarted}
      />
    </div>
  );
}

function AnalyticsContent({
  data,
  cardId,
  onNavigateToConnections,
}: {
  data: AnalyticsDashboardData;
  cardId: string;
  onNavigateToConnections?: () => void;
}) {
  const { t, lang } = useTranslation();

  const chartConfig = useMemo(
    () => ({
      profile_views: { label: t("profileViews"), color: "#a855f7" },
      contact_saves: { label: t("contactSaves"), color: "#34d399" },
      connections: { label: t("connections"), color: "#38bdf8" },
    }),
    [t],
  );

  const empty =
    data.metrics.profile_views + data.metrics.contact_saves + data.metrics.connections === 0;

  // Derive Peak Activity truthfully from data.trend
  const peakActivity = useMemo(() => {
    if (!data.trend || data.trend.length === 0) return null;
    let maxViews = 0;
    let peakIndex = -1;

    for (let i = 0; i < data.trend.length; i++) {
      const item = data.trend[i];
      if (item && item.profile_views >= maxViews && item.profile_views > 0) {
        maxViews = item.profile_views;
        peakIndex = i;
      }
    }

    if (peakIndex === -1 || maxViews === 0) return null;

    const peakItem = data.trend[peakIndex];
    if (!peakItem) return null;

    const { formattedDate, dayOfWeek } = formatLocalizedPeakDate(peakItem.period, lang);

    return {
      period: peakItem.period,
      formattedDate,
      dayOfWeek,
      views: peakItem.profile_views,
      saves: peakItem.contact_saves,
      connections: peakItem.connections,
    };
  }, [data.trend, lang]);

  // Traffic source total and percentage calculation
  const totalAttributedViews = useMemo(() => {
    return data.traffic_sources.reduce((sum, item) => sum + item.count, 0);
  }, [data.traffic_sources]);

  function getLocalizedActionLabel(action: string): string {
    const key = CANONICAL_ACTION_I18N_KEYS[action];
    if (key) {
      return t(key as keyof Translations);
    }
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="space-y-6">
      {/* 4 TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={<Eye className="h-4 w-4 text-purple-400" />}
          iconBg="bg-purple-500/10 border-purple-500/20"
          label={t("profileViews")}
          value={data.metrics.profile_views.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
        />
        <MetricCard
          icon={<Download className="h-4 w-4 text-emerald-400" />}
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          label={t("contactSaves")}
          value={data.metrics.contact_saves.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
        />
        <MetricCard
          icon={<UserRound className="h-4 w-4 text-sky-400" />}
          iconBg="bg-sky-500/10 border-sky-500/20"
          label={t("connections")}
          value={data.metrics.connections.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
        />
        <MetricCard
          icon={<Percent className="h-4 w-4 text-amber-400" />}
          iconBg="bg-amber-500/10 border-amber-500/20"
          label={t("conversionRate")}
          value={`${data.metrics.conversion_rate.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 1 })}%`}
        />
      </div>

      {empty ? (
        <div className="rounded-3xl border border-dashed border-slate-800 justtap-glass p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-3 font-display text-base font-bold text-white">
            {t("noActivityTitle")}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
            {t("noActivityDesc")}
          </p>
        </div>
      ) : (
        <>
          {/* PROFILE ACTIVITY & TRAFFIC SOURCES ROW */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* PROFILE ACTIVITY (LEFT) */}
            <section className="lg:col-span-7 xl:col-span-8 justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-white">
                      {t("profileActivity")}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">{data.trend_label}</p>
                  </div>
                  {/* Visual Legend */}
                  <div
                    className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-300"
                    aria-hidden="true"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                      {t("viewsLegend")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                      {t("savesLegend")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
                      {t("connectionsLegend")}
                    </span>
                  </div>
                </div>

                {/* Line Chart */}
                <ChartContainer
                  config={chartConfig}
                  aria-label={t("profileActivityAria")}
                  className="mt-4 h-56 sm:h-64 w-full"
                  dir="ltr"
                >
                  <LineChart
                    data={data.trend}
                    margin={{ left: -16, right: 12, top: 12, bottom: 4 }}
                  >
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => {
                            if (typeof value === "string") {
                              const { formattedDate } = formatLocalizedPeakDate(value, lang);
                              return formattedDate || value;
                            }
                            return String(value);
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="profile_views"
                      name={t("profileViews")}
                      stroke="var(--color-profile_views)"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="contact_saves"
                      name={t("contactSaves")}
                      stroke="var(--color-contact_saves)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="connections"
                      name={t("connections")}
                      stroke="var(--color-connections)"
                      strokeWidth={2}
                      strokeDasharray="2 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Accessible Data Table Toggle */}
              <details className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 group">
                <summary className="cursor-pointer font-medium text-purple-300 hover:text-purple-200 transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-md px-1 py-0.5">
                  <span>{t("viewTrendDataTable")}</span>
                </summary>
                <div className="mt-3 max-h-48 overflow-y-auto overflow-x-auto rounded-xl border border-slate-800 bg-[#08080a] p-3">
                  <table className="w-full min-w-[28rem] text-left rtl:text-right text-xs">
                    <thead className="text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="py-2 font-medium text-start">{t("utcPeriod")}</th>
                        <th className="font-medium text-start">{t("profileViews")}</th>
                        <th className="font-medium text-start">{t("contactSaves")}</th>
                        <th className="font-medium text-start">{t("connections")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {data.trend.map((point) => (
                        <tr key={point.period}>
                          <td className="py-1.5 text-slate-400 text-start">{point.period}</td>
                          <td className="tabular-nums text-start">{point.profile_views}</td>
                          <td className="tabular-nums text-start">{point.contact_saves}</td>
                          <td className="tabular-nums text-start">{point.connections}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            {/* TRAFFIC SOURCES (RIGHT) */}
            <section className="lg:col-span-5 xl:col-span-4 justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  {t("trafficSources")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">{t("trafficSourcesSubtitle")}</p>

                {totalAttributedViews === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
                    <Globe className="mx-auto h-7 w-7 text-purple-400/80" />
                    <p className="mt-2.5 text-xs font-bold text-white">
                      {t("noTrafficSourcesTitle")}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {t("noTrafficSourcesDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {/* Ring Visualization */}
                    <div className="h-32 w-full flex items-center justify-center" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.traffic_sources}
                            dataKey="count"
                            nameKey="source"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={54}
                            paddingAngle={3}
                            isAnimationActive={false}
                          >
                            {data.traffic_sources.map((entry) => (
                              <Cell
                                key={entry.source}
                                fill={SOURCE_COLORS[entry.source] || "#6b21a8"}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown List */}
                    <ul className="space-y-2.5">
                      {data.traffic_sources.map((item) => {
                        const presentation = PRESENTATION_SOURCE_KEYS[item.source] || {
                          key: "sourceLink" as const,
                          icon: Globe,
                        };
                        const Icon = presentation.icon;
                        const label = t(presentation.key);
                        const percentage =
                          totalAttributedViews > 0
                            ? Math.round((item.count / totalAttributedViews) * 100)
                            : 0;
                        const color = SOURCE_COLORS[item.source] || "#6b21a8";

                        return (
                          <li
                            key={item.source}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-200 truncate">{label}</span>
                            </div>
                            <div className="flex items-center gap-3 tabular-nums shrink-0">
                              <span className="text-slate-400 font-mono">{percentage}%</span>
                              <span className="font-mono font-bold text-white min-w-[2rem] text-right rtl:text-left">
                                {item.count.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* TOP ACTIONS & PEAK ACTIVITY ROW */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* TOP ACTIONS */}
            <section className="justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6">
              <h2 className="font-display text-base font-bold text-white">{t("topActions")}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{t("topActionsSubtitle")}</p>

              {data.top_actions.length === 0 ||
              data.top_actions.every((item) => item.count === 0) ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
                  <TrendingUp className="mx-auto h-7 w-7 text-purple-400/80" />
                  <p className="mt-2.5 text-xs font-bold text-white">{t("noTopActionsTitle")}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {t("noTopActionsDesc")}
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3.5">
                  {(() => {
                    const maxCount = Math.max(...data.top_actions.map((item) => item.count), 1);
                    return data.top_actions.map((item) => {
                      const label = getLocalizedActionLabel(item.action);
                      const percentage = Math.max(Math.round((item.count / maxCount) * 100), 4);
                      return (
                        <div key={item.action} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200">{label}</span>
                            <span className="font-mono font-bold tabular-nums text-white">
                              {item.count.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800/80">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </section>

            {/* PEAK ACTIVITY */}
            <section className="justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-white">{t("peakActivity")}</h2>
                <p className="mt-0.5 text-xs text-slate-400">{t("peakActivitySubtitle")}</p>

                {peakActivity ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                        <Calendar className="h-4 w-4" />
                        <span>{peakActivity.formattedDate}</span>
                      </div>
                      {peakActivity.dayOfWeek && (
                        <p className="mt-0.5 text-xs text-slate-400">{peakActivity.dayOfWeek}</p>
                      )}

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-purple-500/15 pt-3">
                        <div>
                          <p className="font-mono text-lg font-bold text-white">
                            {peakActivity.views.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                          </p>
                          <p className="text-[11px] text-slate-400">{t("viewsLegend")}</p>
                        </div>
                        <div>
                          <p className="font-mono text-lg font-bold text-emerald-300">
                            {peakActivity.saves.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                          </p>
                          <p className="text-[11px] text-slate-400">{t("savesLegend")}</p>
                        </div>
                        <div>
                          <p className="font-mono text-lg font-bold text-sky-300">
                            {peakActivity.connections.toLocaleString(
                              lang === "ar" ? "ar-EG" : "en-US",
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{t("connectionsLegend")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
                    <Clock className="mx-auto h-7 w-7 text-purple-400/80" />
                    <p className="mt-2.5 text-xs font-bold text-white">
                      {t("noPeakActivityTitle")}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {t("noPeakActivityDesc")}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RECENT CONTACTS PREVIEW */}
          <RecentContactsSection
            cardId={cardId}
            onNavigateToConnections={onNavigateToConnections}
          />
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="justtap-glass rounded-3xl border border-slate-800 p-4 sm:p-5 transition-all hover:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function RecentContactsSection({
  cardId,
  onNavigateToConnections,
}: {
  cardId: string;
  onNavigateToConnections?: () => void;
}) {
  const { t, lang } = useTranslation();
  const [contacts, setContacts] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const STATUS_DISPLAY_LABELS: Record<ConnectionStatus, string> = useMemo(
    () => ({
      new: t("statusNew"),
      follow_up: t("statusFollowUp"),
      contacted: t("statusContacted"),
      done: t("statusDone"),
    }),
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("card_leads")
      .select(
        "id,sender_name,sender_phone,sender_email,sender_company,sender_job_title,note,owner_note,status,tags,created_at,updated_at",
      )
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (cancelled) return;
        setContacts((data as Connection[] | null) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  return (
    <section className="justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">{t("recentContacts")}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t("recentContactsSubtitle")}</p>
        </div>
        {onNavigateToConnections && (
          <button
            type="button"
            onClick={onNavigateToConnections}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#121216] px-3 py-1.5 text-xs font-bold text-purple-300 transition-colors hover:border-purple-500/30 hover:bg-purple-900/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <span>{t("viewAll")}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center justify-center py-6 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-purple-500 mr-2 rtl:ml-2 rtl:mr-0" />{" "}
          {t("loadingRecentContacts")}
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
          <UserRound className="mx-auto h-6 w-6 text-purple-400/80" />
          <p className="mt-2 text-xs font-semibold text-slate-300">{t("noContactsYet")}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{t("noContactsYetDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-800/80">
          {contacts.map((contact) => {
            const name = decodeHtmlEntities(contact.sender_name);
            const company = contact.sender_company
              ? decodeHtmlEntities(contact.sender_company)
              : null;
            const statusBadgeClass = STATUS_BADGE_STYLES[contact.status] || STATUS_BADGE_STYLES.new;
            const statusLabel = STATUS_DISPLAY_LABELS[contact.status] || t("statusNew");

            return (
              <button
                key={contact.id}
                type="button"
                onClick={onNavigateToConnections}
                className="w-full flex items-center justify-between gap-3 py-3 text-xs transition-colors hover:bg-slate-900/40 rounded-xl px-2.5 -mx-2.5 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10 font-bold text-purple-300 border border-purple-500/20">
                    {name.charAt(0).toUpperCase() || <UserRound className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{name}</p>
                    {company ? (
                      <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{company}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        {decodeHtmlEntities(contact.sender_phone)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass}`}
                  >
                    {statusLabel}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {formatLocalizedRelativeTime(contact.created_at, lang)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
