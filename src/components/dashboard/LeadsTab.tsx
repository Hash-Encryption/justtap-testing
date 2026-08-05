import { useEffect, useState } from "react";
import { FileDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

  if (loading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">Leads ({leads.length})</h3>
        <button
          type="button"
          onClick={exportCsv}
          disabled={leads.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <FileDown className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {leads.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No leads yet. They appear here when a visitor taps “Exchange Info”.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Note</th>
                <th className="pb-2 pr-4">Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-4 font-medium">{l.sender_name}</td>
                  <td className="py-2.5 pr-4">{l.sender_phone}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{l.note ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void remove(l.id)}
                      aria-label="Delete lead"
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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
