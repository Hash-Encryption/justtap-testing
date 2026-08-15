import { Children, useEffect, useState, type ReactNode } from "react";
import { Download, Eye, Loader2, LockKeyhole, Percent, RefreshCw, UserRound } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ANALYTICS_ACTION_LABELS,
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_LABELS,
  ANALYTICS_SOURCE_LABELS,
  isAnalyticsDashboardData,
  type AnalyticsDashboardData,
  type AnalyticsRange,
} from "@/lib/analytics-dashboard";
import { supabase } from "@/lib/supabase";

const chartConfig = {
  profile_views: { label: "Profile Views", color: "#a855f7" },
  contact_saves: { label: "Contact Saves", color: "#34d399" },
  connections: { label: "Connections", color: "#38bdf8" },
};

export function AnalyticsTab({ cardId, isPro }: { cardId: string; isPro: boolean }) {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(isPro);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isPro) {
      setData(null);
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

  if (!isPro) {
    return (
      <section className="justtap-glass rounded-3xl border border-slate-800 p-6 text-center sm:p-8">
        <LockKeyhole className="mx-auto h-8 w-8 text-purple-400" />
        <h2 className="mt-3 font-display text-base font-bold text-white">
          Analytics is a Pro feature
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Upgrade to Pro to see profile views, contact saves, Connections, and traffic sources.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label="Analytics date range"
        className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap"
      >
        {ANALYTICS_RANGES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={range === value}
            onClick={() => setRange(value)}
            className={`min-h-11 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              range === value
                ? "border-purple-500 bg-purple-700 text-white"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white"
            }`}
          >
            {ANALYTICS_RANGE_LABELS[value]}
          </button>
        ))}
      </div>

      {loading && (
        <div role="status" className="grid min-h-52 place-items-center text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> Loading analytics…
          </span>
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm font-semibold text-white">Analytics couldn&apos;t be loaded.</p>
          <p className="mt-1 text-xs text-slate-400">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-200"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {!loading && !error && data && <AnalyticsContent data={data} />}
    </div>
  );
}

function AnalyticsContent({ data }: { data: AnalyticsDashboardData }) {
  const empty =
    data.metrics.profile_views + data.metrics.contact_saves + data.metrics.connections === 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Eye className="h-5 w-5 text-purple-400" />}
          label="Profile Views"
          value={data.metrics.profile_views.toLocaleString()}
        />
        <Metric
          icon={<Download className="h-5 w-5 text-emerald-400" />}
          label="Contact Saves"
          value={data.metrics.contact_saves.toLocaleString()}
        />
        <Metric
          icon={<UserRound className="h-5 w-5 text-sky-400" />}
          label="Connections"
          value={data.metrics.connections.toLocaleString()}
        />
        <Metric
          icon={<Percent className="h-5 w-5 text-amber-400" />}
          label="Conversion"
          value={`${data.metrics.conversion_rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
        />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
          <Eye className="mx-auto h-8 w-8 text-purple-400" />
          <h2 className="mt-3 text-sm font-bold text-white">No activity in this range</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            Activity appears here after people use your public card.
          </p>
        </div>
      ) : (
        <>
          <section className="justtap-glass rounded-3xl border border-slate-800 p-4 sm:p-6">
            <h2 className="font-display text-base font-bold text-white">Activity trend</h2>
            <p className="mt-1 text-xs text-slate-400">{data.trend_label}</p>
            <ChartContainer
              config={chartConfig}
              aria-label="Profile Views, Contact Saves, and Connections over time"
              className="mt-5 h-64 w-full"
            >
              <LineChart data={data.trend} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="profile_views"
                  name="Profile Views"
                  stroke="var(--color-profile_views)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="contact_saves"
                  name="Contact Saves"
                  stroke="var(--color-contact_saves)"
                  strokeWidth={2.5}
                  strokeDasharray="8 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="connections"
                  name="Connections"
                  stroke="var(--color-connections)"
                  strokeWidth={2.5}
                  strokeDasharray="2 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            <div
              className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300"
              aria-hidden="true"
            >
              <span>Solid — Profile Views</span>
              <span>Long dash — Contact Saves</span>
              <span>Short dash — Connections</span>
            </div>
            <details className="mt-4 text-xs text-slate-300">
              <summary className="min-h-11 cursor-pointer py-3 font-bold text-purple-300">
                View trend data table
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">UTC period</th>
                      <th>Profile Views</th>
                      <th>Contact Saves</th>
                      <th>Connections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trend.map((point) => (
                      <tr key={point.period} className="border-t border-slate-800">
                        <td className="py-2 font-mono">{point.period}</td>
                        <td>{point.profile_views}</td>
                        <td>{point.contact_saves}</td>
                        <td>{point.connections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Top Actions" emptyLabel="No tracked actions in this range.">
              {data.top_actions.map((item) => (
                <BreakdownRow
                  key={item.action}
                  label={ANALYTICS_ACTION_LABELS[item.action]}
                  value={item.count}
                />
              ))}
            </Breakdown>
            <Breakdown
              title="Traffic Sources"
              emptyLabel="No attributed profile views in this range."
            >
              {data.traffic_sources.map((item) => (
                <BreakdownRow
                  key={item.source}
                  label={ANALYTICS_SOURCE_LABELS[item.source]}
                  value={item.count}
                />
              ))}
            </Breakdown>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6">
      {icon}
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function Breakdown({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="justtap-glass rounded-3xl border border-slate-800 p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-white">{title}</h2>
      {Children.count(children) > 0 ? (
        <ul className="mt-4 space-y-3">{children}</ul>
      ) : (
        <p className="mt-3 text-xs text-slate-400">{emptyLabel}</p>
      )}
    </section>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono font-bold tabular-nums text-white">{value.toLocaleString()}</span>
    </li>
  );
}
