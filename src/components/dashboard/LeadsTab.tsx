import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  FileDown,
  Globe,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS: { id: ConnectionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "follow_up", label: "Follow Up" },
  { id: "contacted", label: "Contacted" },
  { id: "done", label: "Done" },
];

const STATUS_DISPLAY_LABELS: Record<ConnectionStatus, string> = {
  new: "New",
  follow_up: "Follow Up",
  contacted: "Contacted",
  done: "Done",
};

const STATUS_BADGE_STYLES: Record<ConnectionStatus, string> = {
  new: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  follow_up: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  contacted: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  done: "bg-slate-800 text-slate-400 border-slate-700",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ConnectionsTab({
  cardId,
  isPro,
  cards,
  onSelectCardId,
}: {
  cardId: string;
  isPro: boolean;
  cards?: { id: string; full_name?: string | null; slug?: string | null }[];
  onSelectCardId?: (id: string) => void;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | "all">("all");

  // Selected Connection for Detail Drawer
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingConnection, setDeletingConnection] = useState<Connection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: connections.length,
      new: 0,
      follow_up: 0,
      contacted: 0,
      done: 0,
    };
    for (const c of connections) {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    }
    return counts;
  }, [connections]);

  // Filtered connections list
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      // Status filter
      if (statusFilter !== "all" && conn.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (conn.sender_name || "").toLowerCase();
        const phone = (conn.sender_phone || "").toLowerCase();
        const email = (conn.sender_email || "").toLowerCase();
        const company = (conn.sender_company || "").toLowerCase();
        const job = (conn.sender_job_title || "").toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          company.includes(query) ||
          job.includes(query)
        );
      }
      return true;
    });
  }, [connections, statusFilter, searchQuery]);

  const selectedConnection = useMemo(() => {
    return connections.find((c) => c.id === selectedConnectionId) || null;
  }, [connections, selectedConnectionId]);

  async function handleDelete(connection: Connection) {
    setIsDeleting(true);
    const { error: removeError } = await supabase
      .from("card_leads")
      .delete()
      .eq("id", connection.id)
      .eq("card_id", cardId);
    setIsDeleting(false);

    if (removeError) {
      toast.error("We couldn't delete this Connection. Please try again.");
      return;
    }

    setConnections((current) => current.filter((item) => item.id !== connection.id));
    if (selectedConnectionId === connection.id) {
      setSelectedConnectionId(null);
    }
    setDeletingConnection(null);
    toast.success(`Deleted connection from ${decodeHtmlEntities(connection.sender_name)}.`);
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
    toast.success("Connections exported to CSV.");
  }

  return (
    <section className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Connections</h1>
          <p className="mt-1 text-xs text-slate-400">
            People who exchanged information through your card.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {cards && cards.length > 1 && onSelectCardId && (
            <select
              value={cardId}
              onChange={(e) => onSelectCardId(e.target.value)}
              className="h-9 rounded-xl border border-slate-800 bg-[#121216] px-3 text-xs font-semibold text-slate-200 focus:border-purple-500 focus:outline-none"
              aria-label="Select card for connections"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || `/c/${c.slug}`}
                </option>
              ))}
            </select>
          )}

          {/* CSV EXPORT */}
          {isPro ? (
            <button
              type="button"
              onClick={exportCsv}
              disabled={connections.length === 0 || loading}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#121216] px-3.5 text-xs font-bold text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white disabled:opacity-40"
            >
              <FileDown className="h-4 w-4 text-purple-400" />
              <span>Export CSV</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-[#121216] px-3 py-1.5 text-xs text-slate-400">
              <LockKeyhole className="h-3.5 w-3.5 text-purple-400" />
              <span>CSV export is available on Pro</span>
            </div>
          )}
        </div>
      </div>

      {/* TOP SEARCH & STATUS FILTER TOOLBAR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* SEARCH FIELD */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="h-10 w-full rounded-2xl border border-slate-800 bg-[#121216] pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* STATUS FILTER PILLS */}
        <div
          role="group"
          aria-label="Filter connections by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            const count = statusCounts[opt.id] ?? 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-purple-500/60 bg-purple-700 text-white shadow-sm shadow-purple-900/20"
                    : "border-slate-800 bg-[#121216] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span>{opt.label}</span>
                {!loading && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                      active ? "bg-purple-900/60 text-purple-200" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div
          role="status"
          className="grid min-h-60 place-items-center rounded-3xl border border-slate-800/80 justtap-glass p-8 text-sm text-slate-400"
        >
          <span className="inline-flex items-center gap-2.5 font-medium text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> Loading Connections…
          </span>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div role="alert" className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
          <p className="font-display text-base font-semibold text-white">
            Connections couldn&apos;t be loaded.
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            Check your network connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {/* EMPTY STATE: NO CONNECTIONS OVERALL */}
      {!loading && !error && connections.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-800 justtap-glass p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <UserRound className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold text-white">No connections yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            When someone exchanges their information through your JustTap card, they’ll appear here.
          </p>
        </div>
      )}

      {/* EMPTY STATE: FILTERED NO RESULTS */}
      {!loading && !error && connections.length > 0 && filteredConnections.length === 0 && (
        <div className="rounded-3xl border border-slate-800 justtap-glass p-10 text-center">
          <p className="text-sm font-semibold text-white">No connections match your filters</p>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your search query or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4 inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-slate-800"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* SCAN LIST VIEW */}
      {!loading && !error && connections.length > 0 && filteredConnections.length > 0 && (
        <div className="space-y-3">
          {filteredConnections.map((connection) => {
            const links = getConnectionContactLinks(
              connection.sender_phone,
              connection.sender_email,
            );
            const name = decodeHtmlEntities(connection.sender_name);
            const statusBadge = STATUS_BADGE_STYLES[connection.status] || STATUS_BADGE_STYLES.new;
            const statusLabel = STATUS_DISPLAY_LABELS[connection.status] || "New";
            const company = connection.sender_company
              ? decodeHtmlEntities(connection.sender_company)
              : null;
            const jobTitle = connection.sender_job_title
              ? decodeHtmlEntities(connection.sender_job_title)
              : null;

            return (
              <article
                key={connection.id}
                onClick={() => setSelectedConnectionId(connection.id)}
                className="group relative flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#121216] p-4 transition-all hover:border-purple-500/40 hover:bg-[#15151b] sm:flex-row sm:items-center"
              >
                {/* CONTACT IDENTITY & DETAILS */}
                <div className="flex min-w-0 items-start sm:items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 font-display text-sm font-bold text-purple-300 border border-purple-500/20">
                    {name.charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-white truncate">{name}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${statusBadge}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                        <Phone className="h-3 w-3 text-slate-500" />
                        {decodeHtmlEntities(connection.sender_phone)}
                      </span>

                      {connection.sender_email && (
                        <span className="hidden sm:inline-flex items-center gap-1 truncate text-slate-400">
                          <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="truncate">{connection.sender_email}</span>
                        </span>
                      )}

                      {(company || jobTitle) && (
                        <span className="flex items-center gap-1 text-slate-400 truncate">
                          <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="truncate">
                            {company}
                            {company && jobTitle ? " · " : ""}
                            {jobTitle}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* TAGS PILLS */}
                    {connection.tags && connection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {connection.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-slate-800 bg-[#08080a] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT ACTIONS & TIMELINE */}
                <div
                  className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {formatRelativeTime(connection.created_at)}
                  </span>

                  {/* QUICK CONTACT ACTIONS */}
                  <div className="flex items-center gap-1.5">
                    {links.whatsapp && (
                      <a
                        href={links.whatsapp}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`WhatsApp ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {links.call && (
                      <a
                        href={links.call}
                        aria-label={`Call ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-colors hover:bg-sky-500/20"
                        title="Call"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {links.email && (
                      <a
                        href={links.email}
                        aria-label={`Email ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300 transition-colors hover:bg-purple-500/20"
                        title="Email"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedConnectionId(connection.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                      title="View Details"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* DETAIL DRAWER (DESKTOP SLIDEOVER & MOBILE SHEET) */}
      <Sheet
        open={Boolean(selectedConnection)}
        onOpenChange={(open) => {
          if (!open) setSelectedConnectionId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-[#121216] border-l border-slate-800 text-white p-0 flex flex-col justify-between overflow-y-auto"
        >
          {selectedConnection && (
            <ConnectionDetailPanel
              connection={selectedConnection}
              isPro={isPro}
              onClose={() => setSelectedConnectionId(null)}
              onSaved={(saved) => {
                setConnections((current) =>
                  current.map((item) => (item.id === saved.id ? saved : item)),
                );
              }}
              onRequestDelete={(conn) => setDeletingConnection(conn)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog
        open={Boolean(deletingConnection)}
        onOpenChange={(open) => {
          if (!open) setDeletingConnection(null);
        }}
      >
        <AlertDialogContent className="bg-[#121216] border border-slate-800 text-white max-w-md">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-display text-lg font-bold text-white">
              Delete{" "}
              {deletingConnection
                ? decodeHtmlEntities(deletingConnection.sender_name)
                : "Connection"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 leading-relaxed">
              This removes this Connection from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl border-slate-800 bg-[#08080a] text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => {
                if (deletingConnection) void handleDelete(deletingConnection);
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ConnectionDetailPanel({
  connection,
  isPro,
  onClose,
  onSaved,
  onRequestDelete,
}: {
  connection: Connection;
  isPro: boolean;
  onClose: () => void;
  onSaved: (connection: Connection) => void;
  onRequestDelete: (connection: Connection) => void;
}) {
  const [status, setStatus] = useState<ConnectionStatus>(connection.status);
  const [tags, setTags] = useState<string[]>(connection.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [ownerNote, setOwnerNote] = useState(connection.owner_note ?? "");
  const [saving, setSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Sync state when connection prop changes
  useEffect(() => {
    setStatus(connection.status);
    setTags(connection.tags ?? []);
    setTagInput("");
    setOwnerNote(connection.owner_note ?? "");
    setTagError(null);
  }, [connection]);

  const name = decodeHtmlEntities(connection.sender_name);
  const company = connection.sender_company ? decodeHtmlEntities(connection.sender_company) : null;
  const jobTitle = connection.sender_job_title
    ? decodeHtmlEntities(connection.sender_job_title)
    : null;
  const links = getConnectionContactLinks(connection.sender_phone, connection.sender_email);

  function handleAddTag() {
    setTagError(null);
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (!trimmed) return;

    try {
      const combined = [...tags, trimmed].join(",");
      const parsed = parseConnectionTags(combined);
      setTags(parsed);
      setTagInput("");
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Invalid tag");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags((current) => current.filter((t) => t !== tagToRemove));
  }

  async function handleSave() {
    setSaving(true);
    setTagError(null);

    const { data, error: saveError } = await supabase
      .from("card_leads")
      .update({
        owner_note: ownerNote.trim() || null,
        tags,
        status,
      })
      .eq("id", connection.id)
      .select("owner_note,status,tags,updated_at")
      .single();

    setSaving(false);

    if (saveError || !data) {
      toast.error("We couldn't save these follow-up details. Please try again.");
      return;
    }

    onSaved({
      ...connection,
      owner_note: data.owner_note,
      status: data.status as ConnectionStatus,
      tags: data.tags ?? [],
      updated_at: data.updated_at,
    });

    toast.success("Follow-up details saved.");
  }

  return (
    <div className="flex h-full flex-col justify-between">
      {/* DRAWER HEADER */}
      <div className="space-y-6 p-6">
        <SheetHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.new
              }`}
            >
              {STATUS_DISPLAY_LABELS[status]}
            </span>
          </div>
          <SheetTitle className="font-display text-xl font-bold text-white">{name}</SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            Connected on {new Date(connection.created_at).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        {/* CONTACT INFORMATION */}
        <div className="rounded-2xl border border-slate-800 bg-[#08080a] p-4 space-y-2.5 text-xs text-slate-300">
          <p className="flex items-center gap-2 font-mono">
            <Phone className="h-4 w-4 text-slate-500 shrink-0" />
            <span>{decodeHtmlEntities(connection.sender_phone)}</span>
          </p>
          {connection.sender_email && (
            <p className="flex items-center gap-2 truncate">
              <Mail className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="truncate">{connection.sender_email}</span>
            </p>
          )}
          {(company || jobTitle) && (
            <p className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="truncate">
                {company}
                {company && jobTitle ? " · " : ""}
                {jobTitle}
              </span>
            </p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-3 gap-2">
          {links.whatsapp ? (
            <a
              href={links.whatsapp}
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
          )}

          {links.call ? (
            <a
              href={links.call}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </button>
          )}

          {links.email ? (
            <a
              href={links.email}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 text-xs font-bold text-purple-300 transition-colors hover:bg-purple-500/20"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </button>
          )}
        </div>

        {/* VISITOR NOTE */}
        {connection.note && (
          <div className="rounded-2xl border border-slate-800 bg-[#08080a] p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Visitor note
              </p>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Shared by this person when they connected.
            </p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
              {decodeHtmlEntities(connection.note)}
            </p>
          </div>
        )}

        {/* PRO MANAGEMENT SECTION */}
        {isPro ? (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            {/* PRIVATE TAGS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Private tags</label>
                <span className="text-[10px] text-slate-500">{tags.length}/20</span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-7">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-200"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-purple-300 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  maxLength={40}
                  placeholder="Add tag (e.g. event, priority)…"
                  className="h-9 flex-1 rounded-xl border border-slate-800 bg-[#08080a] px-3 text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
              {tagError && <p className="text-[11px] text-red-400">{tagError}</p>}
            </div>

            {/* FOLLOW-UP STATUS */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Follow-up status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ConnectionStatus)}
                className="h-10 w-full rounded-xl border border-slate-800 bg-[#08080a] px-3 text-xs text-white outline-none focus:border-purple-500"
              >
                {Object.entries(STATUS_DISPLAY_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            {/* PRIVATE NOTE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5 text-purple-400" />
                  <span>Private note</span>
                </label>
                <span className="text-[10px] text-slate-500">Only you can see this</span>
              </div>
              <textarea
                value={ownerNote}
                onChange={(e) => setOwnerNote(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Add a private follow-up note…"
                className="w-full rounded-xl border border-slate-800 bg-[#08080a] p-3 text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white transition-colors hover:bg-purple-600 disabled:opacity-60 shadow-md shadow-purple-900/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving…" : "Save changes"}</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/80 bg-[#08080a] p-4 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-purple-400" />
              <span>Pro Follow-up Features</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Private notes, custom tags, and pipeline follow-up statuses are available on Pro.
            </p>
          </div>
        )}
      </div>

      {/* DRAWER FOOTER / DESTRUCTIVE ACTION */}
      <div className="border-t border-slate-800/80 p-6 bg-[#0e0e12]">
        <button
          type="button"
          onClick={() => onRequestDelete(connection)}
          className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/30"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete connection</span>
        </button>
      </div>
    </div>
  );
}
