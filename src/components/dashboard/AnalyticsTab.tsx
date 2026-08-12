import { useEffect, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AnalyticsTab({ cardId }: { cardId: string }) {
  const [views, setViews] = useState(0);
  const [downloads, setDownloads] = useState(0);
  const [recent, setRecent] = useState<{ event_type: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("card_analytics")
        .select("event_type, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const rows = data ?? [];
      setViews(rows.filter((r) => r.event_type === "page_view").length);
      setDownloads(rows.filter((r) => r.event_type === "vcard_download").length);
      setRecent(rows.slice(0, 12));
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-purple-500" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          icon={<Eye className="w-5 h-5 text-purple-400" />}
          label="Total Scans & Views"
          value={views}
        />
        <Metric
          icon={<Download className="w-5 h-5 text-emerald-400" />}
          label="Contact Downloads (vCard)"
          value={downloads}
        />
      </div>
      <div className="justtap-glass rounded-3xl p-6 border border-slate-800">
        <h3 className="font-display text-base font-bold text-white">Recent Activity Log</h3>
        {recent.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">No activity recorded yet for this card.</p>
        ) : (
          <ul className="mt-4 space-y-2.5 text-xs">
            {recent.map((r, i) => (
              <li
                key={i}
                className="flex justify-between items-center border-b border-slate-800/80 pb-2.5"
              >
                <span className="text-slate-200 font-medium">
                  {r.event_type === "page_view"
                    ? "👀 Card Profile Viewed"
                    : "💾 vCard Contact Downloaded"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="justtap-glass rounded-3xl p-6 border border-slate-800">
      <div className="flex items-center space-x-2">{icon}</div>
      <p className="mt-3 font-display text-4xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}
