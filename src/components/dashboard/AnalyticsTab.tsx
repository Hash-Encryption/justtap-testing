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
    return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric icon={<Eye className="h-4 w-4" />} label="Total scans / views" value={views} />
        <Metric
          icon={<Download className="h-4 w-4" />}
          label="Contact downloads"
          value={downloads}
        />
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold">Recent activity</h3>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((r, i) => (
              <li key={i} className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">
                  {r.event_type === "page_view" ? "Card viewed" : "Contact saved"}
                </span>
                <span className="text-xs text-muted-foreground">
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
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="mt-3 font-display text-4xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
