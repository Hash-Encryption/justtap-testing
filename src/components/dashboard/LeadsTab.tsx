import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  FileDown,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/sanitization";
import type { Session } from "@supabase/supabase-js";
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
import { formatLocalizedRelativeTime, useTranslation, type Translations } from "@/lib/i18n";
import { ProUpgradeDialog, type ProUpgradeSource } from "./ProUpgradeDialog";

const STATUS_OPTIONS: {
  id: ConnectionStatus | "all";
  labelKey: "statusAll" | "statusNew" | "statusFollowUp" | "statusContacted" | "statusDone";
}[] = [
  { id: "all", labelKey: "statusAll" },
  { id: "new", labelKey: "statusNew" },
  { id: "follow_up", labelKey: "statusFollowUp" },
  { id: "contacted", labelKey: "statusContacted" },
  { id: "done", labelKey: "statusDone" },
];

const STATUS_BADGE_STYLES: Record<ConnectionStatus, string> = {
  new: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  follow_up: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  contacted: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  done: "bg-slate-800 text-slate-400 border-slate-700",
};

export function ConnectionsTab({
  cardId,
  isPro,
  cards,
  onSelectCardId,
  session,
  onTrialStarted,
}: {
  cardId: string;
  isPro: boolean;
  cards?: { id: string; full_name?: string | null; slug?: string | null }[];
  onSelectCardId?: (id: string) => void;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
}) {
  const { t, lang } = useTranslation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  // Upgrade Modal State
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState<ProUpgradeSource>("connections_save");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | "all">("all");

  // Selected Connection for Detail Drawer
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingConnection, setDeletingConnection] = useState<Connection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      toast.error(t("deleteFailedToast"));
      return;
    }

    setConnections((current) => current.filter((item) => item.id !== connection.id));
    if (selectedConnectionId === connection.id) {
      setSelectedConnectionId(null);
    }
    setDeletingConnection(null);
    const name = decodeHtmlEntities(connection.sender_name);
    toast.success(
      lang === "ar" ? `تم حذف جهة الاتصال: ${name}` : `Deleted connection from ${name}.`,
    );
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
    toast.success(t("exportedCsvToast"));
  }

  return (
    <section className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {t("connectionsTitle")}
          </h1>
          <p className="mt-1 text-xs text-slate-400">{t("connectionsSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {cards && cards.length > 1 && onSelectCardId && (
            <select
              value={cardId}
              onChange={(e) => onSelectCardId(e.target.value)}
              className="h-9 rounded-xl border border-slate-800 bg-[#121216] px-3 text-xs font-semibold text-slate-200 focus:border-purple-500 focus:outline-none"
              aria-label={t("selectCardConnectionsAria")}
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
              data-testid="connections-export-csv-btn"
              onClick={exportCsv}
              disabled={connections.length === 0 || loading}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#121216] px-3.5 text-xs font-bold text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white disabled:opacity-40"
            >
              <FileDown className="h-4 w-4 text-purple-400" />
              <span>{t("exportCsv")}</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="connections-export-csv-btn"
              onClick={() => {
                setUpgradeSource("connections_export");
                setUpgradeOpen(true);
              }}
              disabled={connections.length === 0 || loading}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#121216] px-3.5 text-xs font-bold text-slate-200 transition-colors hover:border-purple-500/40 hover:bg-slate-900 hover:text-white disabled:opacity-40"
            >
              <FileDown className="h-4 w-4 text-purple-400" />
              <span>{t("exportCsv")}</span>
              <span
                data-testid="connections-export-pro-marker"
                className="rounded-md border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300"
              >
                {t("proMarker")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* TOP SEARCH & STATUS FILTER TOOLBAR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* SEARCH FIELD */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchConnectionsPlaceholder")}
              className="h-10 w-full rounded-2xl border border-slate-800 bg-[#121216] pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* STATUS FILTER PILLS */}
        <div
          role="group"
          aria-label={t("filterConnectionsAria")}
          className="flex flex-wrap items-center gap-1.5"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            const count = statusCounts[opt.id] ?? 0;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(opt.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  active
                    ? "border-purple-500/60 bg-purple-700 text-white shadow-sm shadow-purple-900/20"
                    : "border-slate-800 bg-[#121216] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span>{t(opt.labelKey)}</span>
                {!loading && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                      active ? "bg-purple-900/60 text-purple-200" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
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
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> {t("loadingConnections")}
          </span>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div role="alert" className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
          <p className="font-display text-base font-semibold text-white">
            {t("connectionsErrorTitle")}
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

      {/* EMPTY STATE: NO CONNECTIONS OVERALL */}
      {!loading && !error && connections.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-800 justtap-glass p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <UserRound className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold text-white">
            {t("noConnectionsOverallTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            {t("noConnectionsOverallDesc")}
          </p>
        </div>
      )}

      {/* EMPTY STATE: FILTERED NO RESULTS */}
      {!loading && !error && connections.length > 0 && filteredConnections.length === 0 && (
        <div className="rounded-3xl border border-slate-800 justtap-glass p-10 text-center">
          <p className="text-sm font-semibold text-white">{t("noFilteredConnectionsTitle")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("noFilteredConnectionsDesc")}</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4 inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {t("clearFilters")}
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
            const statusLabel = STATUS_DISPLAY_LABELS[connection.status] || t("statusNew");
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
                className="group relative flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#121216] p-4 transition-all hover:border-purple-500/40 hover:bg-[#15151b] sm:flex-row sm:items-center text-start"
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
                        <Phone className="h-3 w-3 text-slate-500 shrink-0" />
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
                    {formatLocalizedRelativeTime(connection.created_at, lang)}
                  </span>

                  {/* QUICK CONTACT ACTIONS */}
                  <div className="flex items-center gap-1.5">
                    {links.whatsapp && (
                      <a
                        href={links.whatsapp}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`${t("whatsappAction")} ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        title={t("whatsappAction")}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {links.call && (
                      <a
                        href={links.call}
                        aria-label={`${t("callAction")} ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-colors hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        title={t("callAction")}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {links.email && (
                      <a
                        href={links.email}
                        aria-label={`${t("emailAction")} ${name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300 transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                        title={t("emailAction")}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedConnectionId(connection.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                      aria-label={`${t("viewDetails")} ${name}`}
                      title={t("viewDetails")}
                    >
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
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
          className="w-full sm:max-w-md bg-[#121216] border-l rtl:border-l-0 rtl:border-r border-slate-800 text-white p-0 flex flex-col justify-between overflow-y-auto"
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
              onRequestUpgrade={(source) => {
                setUpgradeSource(source);
                setUpgradeOpen(true);
              }}
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
          <AlertDialogHeader className="text-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-display text-lg font-bold text-white">
              {t("deleteConnectionDialogTitle")}{" "}
              {deletingConnection
                ? decodeHtmlEntities(deletingConnection.sender_name)
                : t("connectionsTitle")}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 leading-relaxed">
              {t("deleteConnectionDialogDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl border-slate-800 bg-[#08080a] text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => {
                if (deletingConnection) void handleDelete(deletingConnection);
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isDeleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SHARED PRO UPGRADE DIALOG */}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        source={upgradeSource}
        session={session}
        onTrialStarted={(trialEndsAt) => {
          onTrialStarted?.(trialEndsAt);
          setUpgradeOpen(false);
        }}
      />
    </section>
  );
}

function ConnectionDetailPanel({
  connection,
  isPro,
  onClose,
  onSaved,
  onRequestDelete,
  onRequestUpgrade,
}: {
  connection: Connection;
  isPro: boolean;
  onClose: () => void;
  onSaved: (connection: Connection) => void;
  onRequestDelete: (connection: Connection) => void;
  onRequestUpgrade: (source: ProUpgradeSource) => void;
}) {
  const { t, lang } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>(connection.status);
  const [tags, setTags] = useState<string[]>(connection.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [ownerNote, setOwnerNote] = useState(connection.owner_note ?? "");
  const [saving, setSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const STATUS_DISPLAY_LABELS: Record<ConnectionStatus, string> = useMemo(
    () => ({
      new: t("statusNew"),
      follow_up: t("statusFollowUp"),
      contacted: t("statusContacted"),
      done: t("statusDone"),
    }),
    [t],
  );

  // Sync state when connection prop changes
  useEffect(() => {
    setStatus(connection.status);
    setTags(connection.tags ?? []);
    setTagInput("");
    setOwnerNote(connection.owner_note ?? "");
    setTagError(null);
  }, [connection.id]);

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
    if (!isPro) {
      onRequestUpgrade("connections_save");
      return;
    }

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
      toast.error(t("saveFailedToast"));
      return;
    }

    onSaved({
      ...connection,
      owner_note: data.owner_note,
      status: data.status as ConnectionStatus,
      tags: data.tags ?? [],
      updated_at: data.updated_at,
    });

    toast.success(t("savedFollowUpToast"));
  }

  return (
    <div className="flex h-full flex-col justify-between text-start">
      {/* DRAWER HEADER */}
      <div className="space-y-6 p-6">
        <SheetHeader className="text-start space-y-1">
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
            {t("connectedOn")}{" "}
            {new Date(connection.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
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
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t("whatsappAction")}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t("whatsappAction")}</span>
            </button>
          )}

          {links.call ? (
            <a
              href={links.call}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Phone className="h-4 w-4" />
              <span>{t("callAction")}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <Phone className="h-4 w-4" />
              <span>{t("callAction")}</span>
            </button>
          )}

          {links.email ? (
            <a
              href={links.email}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 text-xs font-bold text-purple-300 transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Mail className="h-4 w-4" />
              <span>{t("emailAction")}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-medium text-slate-500 opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>{t("emailAction")}</span>
            </button>
          )}
        </div>

        {/* VISITOR NOTE */}
        {connection.note && (
          <div className="rounded-2xl border border-slate-800 bg-[#08080a] p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("visitorNote")}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 italic">{t("visitorNoteDesc")}</p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
              {decodeHtmlEntities(connection.note)}
            </p>
          </div>
        )}

        {/* PRO MANAGEMENT SECTION (INTERACTIVE FOR BOTH PRO AND FREE PREVIEW) */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-slate-300">
                {t("proFollowUpFeaturesTitle")}
              </span>
            </div>
            {!isPro && (
              <span
                data-testid="connections-pro-preview-marker"
                className="rounded-md border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300"
              >
                {t("proPreviewBadge")}
              </span>
            )}
          </div>

          {/* PRIVATE TAGS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">{t("privateTags")}</label>
              <span className="text-[10px] text-slate-500 tabular-nums">
                {tags.length.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}/
                {(20).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
              </span>
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
                    className="text-purple-300 hover:text-white focus-visible:outline-none"
                    aria-label={`${t("removeTagAria")} #${tag}`}
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
                placeholder={t("addTagPlaceholder")}
                className="h-9 flex-1 rounded-xl border border-slate-800 bg-[#08080a] px-3 text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("add")}</span>
              </button>
            </div>
            {tagError && <p className="text-[11px] text-red-400">{tagError}</p>}
          </div>

          {/* FOLLOW-UP STATUS */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">{t("followUpStatus")}</label>
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
                <span>{t("privateNote")}</span>
              </label>
              <span className="text-[10px] text-slate-500">{t("onlyYouCanSeeThis")}</span>
            </div>
            <textarea
              value={ownerNote}
              onChange={(e) => setOwnerNote(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t("privateNotePlaceholder")}
              className="w-full rounded-xl border border-slate-800 bg-[#08080a] p-3 text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* SAVE OR UPGRADE BUTTON */}
          {isPro ? (
            <button
              type="button"
              data-testid="save-follow-up-btn"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white transition-colors hover:bg-purple-600 disabled:opacity-60 shadow-md shadow-purple-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? t("saving") : t("saveChanges")}</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="upgrade-to-save-follow-up-btn"
              onClick={() => void handleSave()}
              className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-amber-500 px-4 text-xs font-bold text-white transition-all hover:opacity-95 shadow-md shadow-purple-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Sparkles className="h-4 w-4" />
              <span>{t("upgradeToSaveFollowUp")}</span>
              <span className="rounded-md border border-amber-400/30 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-200">
                {t("proMarker")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* DRAWER FOOTER / DESTRUCTIVE ACTION */}
      <div className="border-t border-slate-800/80 p-6 bg-[#0e0e12]">
        <button
          type="button"
          onClick={() => onRequestDelete(connection)}
          className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <Trash2 className="h-4 w-4" />
          <span>{t("deleteConnection")}</span>
        </button>
      </div>
    </div>
  );
}
