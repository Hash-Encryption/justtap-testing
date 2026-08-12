import { useEffect, useState } from "react";
import { FileDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/sanitization";

type Lead = {
  id: string;
  sender_name: string;
  sender_phone: string;
  note: string | null;
  created_at: string;
};

export function LeadsTab({ cardId }: { cardId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("card_leads")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setLeads((data as Lead[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function remove(id: string) {
    const { error } = await supabase.from("card_leads").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLeads((l) => l.filter((x) => x.id !== id));
  }

  function exportCsv() {
    const rows = [
      ["Name", "Phone", "Note", "Date"],
      ...leads.map((l) => [l.sender_name, l.sender_phone, l.note ?? "", l.created_at]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-purple-500" />;

  return (
    <div className="justtap-glass rounded-3xl p-6 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-white">
            Captured Leads ({leads.length})
          </h3>
          <p className="text-xs text-slate-400">
            Leads captured from &quot;Exchange Info&quot; on your public profile
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={leads.length === 0}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" /> <span>Export CSV</span>
        </button>
      </div>

      {leads.length === 0 ? (
        <p className="pt-4 text-xs text-slate-400">
          No leads captured yet for this card. Visitors can tap &quot;Exchange Info&quot; on your
          card to share their details.
        </p>
      ) : (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Phone</th>
                <th className="pb-3 pr-4">Note</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-900/40">
                  <td className="py-3 pr-4 font-bold text-white">
                    {decodeHtmlEntities(l.sender_name)}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 font-mono">
                    {decodeHtmlEntities(l.sender_phone)}
                  </td>
                  <td className="py-3 pr-4 text-slate-400 max-w-xs truncate">
                    {l.note ? decodeHtmlEntities(l.note) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-[11px] text-slate-400 font-mono">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(l.id)}
                      aria-label="Delete lead"
                      className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
