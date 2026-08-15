import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  FileDown,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/sanitization";
import {
  buildConnectionsCsv,
  getConnectionContactLinks,
  parseConnectionTags,
  type Connection,
  type ConnectionStatus,
} from "@/lib/connections";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  new: "New",
  follow_up: "Follow Up",
  contacted: "Contacted",
  done: "Done",
};

function ConnectionManagement({
  connection,
  onSaved,
}: {
  connection: Connection;
  onSaved: (connection: Connection) => void;
}) {
  const [ownerNote, setOwnerNote] = useState(connection.owner_note ?? "");
  const [tags, setTags] = useState(connection.tags.join(", "));
  const [status, setStatus] = useState(connection.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    let parsedTags: string[];
    try {
      parsedTags = parseConnectionTags(tags);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the tags and try again.");
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await supabase
      .from("card_leads")
      .update({ owner_note: ownerNote.trim() || null, tags: parsedTags, status })
      .eq("id", connection.id)
      .select("owner_note,status,tags,updated_at")
      .single();
    setSaving(false);

    if (saveError || !data) {
      setError("We couldn't save these follow-up details. Please try again.");
      return;
    }

    onSaved({
      ...connection,
      owner_note: data.owner_note,
      status: data.status as ConnectionStatus,
      tags: data.tags ?? [],
      updated_at: data.updated_at,
    });
    setTags((data.tags ?? []).join(", "));
    toast.success("Connection follow-up saved.");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-300">
          <span>Follow-up status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ConnectionStatus)}
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-purple-500"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-300">
          <span>Private tags</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={819}
            placeholder="event, priority"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-500"
          />
        </label>
      </div>
      <label className="space-y-1 text-xs font-semibold text-slate-300">
        <span>Private owner note</span>
        <textarea
          value={ownerNote}
          onChange={(event) => setOwnerNote(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Add a private follow-up note…"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-500"
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save follow-up"}
      </button>
    </div>
  );
}

export function ConnectionsTab({ cardId, isPro }: { cardId: string; isPro: boolean }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setConnections([]);
    setLoading(true);
    setError(false);

    supabase
      .from("card_leads")
      .select(
        "id,sender_name,sender_phone,sender_email,sender_company,sender_job_title,note,owner_note,status,tags,created_at,updated_at",
      )
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        setConnections((data as Connection[] | null) ?? []);
        setError(Boolean(loadError));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, reload]);

  async function remove(id: string) {
    if (!window.confirm("Delete this Connection? This can't be undone.")) return;
    const { error: removeError } = await supabase
      .from("card_leads")
      .delete()
      .eq("id", id)
      .eq("card_id", cardId);
    if (removeError) {
      toast.error("We couldn't delete this Connection. Please try again.");
      return;
    }
    setConnections((current) => current.filter((connection) => connection.id !== id));
  }

  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", buildConnectionsCsv(connections)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "connections.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="justtap-glass space-y-5 rounded-3xl border border-slate-800 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-white">
            Connections {!loading && !error ? `(${connections.length})` : ""}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            People who exchanged information through this card.
          </p>
        </div>
        {isPro ? (
          <button
            type="button"
            onClick={exportCsv}
            disabled={connections.length === 0 || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <LockKeyhole className="h-3.5 w-3.5" /> CSV export is available on Pro
          </p>
        )}
      </div>

      {loading && (
        <div role="status" className="grid min-h-40 place-items-center text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> Loading Connections…
          </span>
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm font-semibold text-white">Connections couldn&apos;t be loaded.</p>
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

      {!loading && !error && connections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
          <UserRound className="mx-auto h-8 w-8 text-purple-400" />
          <h3 className="mt-3 text-sm font-bold text-white">No Connections yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
            When someone uses Exchange Info on your public card, their details will appear here.
          </p>
        </div>
      )}

      {!loading && !error && connections.length > 0 && (
        <div className="space-y-4">
          {connections.map((connection) => {
            const links = getConnectionContactLinks(
              connection.sender_phone,
              connection.sender_email,
            );
            const name = decodeHtmlEntities(connection.sender_name);
            return (
              <article
                key={connection.id}
                className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-purple-500/10 font-bold text-purple-300">
                      {name.charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white">{name}</h3>
                      <p className="text-xs text-slate-500">
                        {new Date(connection.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(connection.id)}
                    aria-label={`Delete Connection from ${name}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    {decodeHtmlEntities(connection.sender_phone)}
                  </p>
                  {connection.sender_email && (
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{connection.sender_email}</span>
                    </p>
                  )}
                  {connection.sender_company && (
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      {decodeHtmlEntities(connection.sender_company)}
                    </p>
                  )}
                  {connection.sender_job_title && (
                    <p className="flex items-center gap-2">
                      <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                      {decodeHtmlEntities(connection.sender_job_title)}
                    </p>
                  )}
                </div>

                {connection.note && (
                  <div className="rounded-xl bg-slate-900 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Visitor note
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {decodeHtmlEntities(connection.note)}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {links.whatsapp && (
                    <a
                      href={links.whatsapp}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500/10 px-4 text-xs font-bold text-emerald-300"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  )}
                  {links.call && (
                    <a
                      href={links.call}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-500/10 px-4 text-xs font-bold text-sky-300"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  )}
                  {links.email && (
                    <a
                      href={links.email}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-500/10 px-4 text-xs font-bold text-purple-300"
                    >
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  )}
                </div>

                {isPro ? (
                  <ConnectionManagement
                    connection={connection}
                    onSaved={(saved) =>
                      setConnections((current) =>
                        current.map((item) => (item.id === saved.id ? saved : item)),
                      )
                    }
                  />
                ) : (
                  <p className="flex items-center gap-2 border-t border-slate-800 pt-3 text-xs text-slate-500">
                    <LockKeyhole className="h-3.5 w-3.5" /> Private notes, tags, and follow-up
                    status are available on Pro.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
