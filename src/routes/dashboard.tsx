import React, { Component, useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ExternalLink,
  Inbox,
  LayoutGrid,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { emptyCard, type Card } from "@/lib/card";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { CardEditor } from "@/components/dashboard/CardEditor";
import { ProFeaturesTab } from "@/components/dashboard/ProFeaturesTab";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { ConnectionsTab } from "@/components/dashboard/LeadsTab";
import { QrTab } from "@/components/dashboard/QrTab";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isProEntitled } from "@/lib/card-design";
import { validateSlug } from "@/lib/slug";
import {
  clearCardDraft,
  GUEST_DRAFT_CARD_ID,
  migrateLegacyCardDraft,
  readCardDraft,
} from "@/lib/card-draft";

class TabErrorBoundary extends Component<
  { children: ReactNode; fallbackTitle?: string; reloadText?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallbackTitle?: string; reloadText?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Tab render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="justtap-glass rounded-3xl p-8 text-center border border-slate-800">
          <h2 className="text-lg font-bold text-white font-display">
            {this.props.fallbackTitle || "Special Features Editor"}
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            {this.state.error?.message || "Temporarily unable to render features component."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white"
          >
            {this.props.reloadText || "Reload Component"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

async function uploadDataUrlIfNeeded(
  dataUrl: string | null | undefined,
  userId: string,
  prefix: string,
): Promise<string | null> {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith("data:")) return dataUrl;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
    const ext = mime.split("/")[1] || "png";
    const path = `${userId}/${prefix}_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: mime, upsert: true, cacheControl: "3600" });

    if (!error) {
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
  } catch (err) {
    console.error("Failed to upload guest asset to storage:", err);
  }
  return dataUrl;
}

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — JustTap Digital Cards" },
      {
        name: "description",
        content: "Manage your digital business cards, analytics, Connections and QR codes.",
      },
      { property: "og:title", content: "Dashboard — JustTap" },
      {
        property: "og:description",
        content: "Multi-card dashboard for your digital business identity.",
      },
    ],
  }),
  component: Dashboard,
});

type Tab = "cards" | "analytics" | "qr" | "leads" | "pro";

function Dashboard() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const userId = user?.id;
  const userEmailRef = React.useRef(user?.email);
  userEmailRef.current = user?.email;

  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Card | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("cards");
  const [tagStatusMap, setTagStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { redirect: "/dashboard" }, replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadUserCards() {
      if (!userId) return;

      // 1. Check for pending guest draft to claim
      let guestPayload: Card | null = null;
      try {
        const stored =
          readCardDraft(window.localStorage, "guest", GUEST_DRAFT_CARD_ID) ??
          migrateLegacyCardDraft(window.localStorage, "guest", {
            ...emptyCard,
            user_id: "guest",
          });
        if (stored?.fields.full_name && stored.fields.phone) {
          guestPayload = { ...emptyCard, ...stored.fields, user_id: "guest" };
        }
      } catch {
        /* ignore */
      }

      // Fetch all user cards (0..N)
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      const userCards = (data as Card[] | null) ?? [];

      // Auto-publish guest draft if present and user has no cards yet
      if (guestPayload && userCards.length === 0) {
        const slugResult = validateSlug(guestPayload.slug || guestPayload.full_name);
        if (slugResult.valid) {
          const slugToUse = slugResult.slug;
          const avatar_url = await uploadDataUrlIfNeeded(guestPayload.avatar_url, userId, "avatar");
          const logo_url = await uploadDataUrlIfNeeded(guestPayload.logo_url, userId, "logo");

          const payload = {
            user_id: userId,
            slug: slugToUse,
            full_name: guestPayload.full_name.trim(),
            phone: guestPayload.phone.trim(),
            email: guestPayload.email || userEmailRef.current || null,
            title: guestPayload.title || null,
            company: guestPayload.company || null,
            bio: guestPayload.bio || null,
            avatar_url,
            logo_url,
            show_logo_badge: guestPayload.show_logo_badge,
            header_pattern: guestPayload.header_pattern || "wave",
            accent_color: guestPayload.accent_color || "#6B21A8",
            bg_color: guestPayload.bg_color || "#08080A",
            design_mode: guestPayload.design_mode || "classic_v2",
            surface_color: guestPayload.surface_color || "#121216",
            champagne_accent: guestPayload.champagne_accent || "#E6D5AC",
            text_color: guestPayload.text_color || "#FAFAFA",
            surface_finish: guestPayload.surface_finish || "matte",
            border_radius: guestPayload.border_radius || "minimal",
            font_family: guestPayload.font_family || "Outfit",
            whatsapp_phone: guestPayload.whatsapp_phone || null,
            whatsapp_message: guestPayload.whatsapp_message || null,
            enable_arabic: guestPayload.enable_arabic || false,
            full_name_ar: guestPayload.full_name_ar || null,
            title_ar: guestPayload.title_ar || null,
            bio_ar: guestPayload.bio_ar || null,
            social_links: guestPayload.social_links ?? {},
            pro_features: guestPayload.pro_features ?? {},
          };

          const { data: created } = await supabase.from("cards").insert(payload).select().single();

          if (created) {
            try {
              clearCardDraft(window.localStorage, "guest", GUEST_DRAFT_CARD_ID);
            } catch {
              /* ignore */
            }
            const published = created as Card;
            setCards([published]);
            setSelectedCardId(published.id);
            setDraft(published);
            setEditing(false);
            setFetching(false);
            toast.success(t("cardPublishedToast"));
            return;
          }
        }
      }

      setCards(userCards);
      if (userCards.length > 0) {
        const first = userCards[0];
        if (first) {
          setSelectedCardId(first.id);
          setDraft(first);
        }
      } else {
        setDraft({ ...emptyCard, user_id: userId });
      }

      // Check NFC tag assignment status for user cards via customer-safe RPC
      try {
        const { data: tags } = await supabase.rpc("get_customer_card_tags");
        if (tags) {
          const map: Record<string, string> = {};
          for (const t of tags) {
            if (t.assigned_card_id) {
              map[t.assigned_card_id] = t.status || "assigned";
            }
          }
          setTagStatusMap(map);
        }
      } catch {
        /* ignore RPC error */
      }

      setFetching(false);
    }

    void loadUserCards();

    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0] || draft || emptyCard;

  const handleSelectCardForEdit = (targetCard: Card) => {
    setSelectedCardId(targetCard.id);
    setDraft({ ...targetCard });
    setEditing(true);
    setTab("cards");
  };

  const handleCreateNewCard = () => {
    const newDraft: Card = {
      ...emptyCard,
      user_id: user?.id ?? "",
      full_name: "",
      phone: "",
      slug: "",
    };
    setSelectedCardId(null);
    setDraft(newDraft);
    setEditing(true);
    setTab("cards");
  };

  const handleTrialStarted = (trialEndsAt: Date) => {
    if (!selectedCardId) return;
    setCards((prev) =>
      prev.map((c) =>
        c.id === selectedCardId
          ? {
              ...c,
              plan_tier: "trialing" as const,
              trial_ends_at: trialEndsAt.toISOString(),
            }
          : c,
      ),
    );
    setDraft((prev) =>
      prev && prev.id === selectedCardId
        ? {
            ...prev,
            plan_tier: "trialing" as const,
            trial_ends_at: trialEndsAt.toISOString(),
          }
        : prev,
    );
  };

  if (loading || fetching || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08080A]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "cards", label: t("cardsTab"), icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "analytics", label: t("analyticsTab"), icon: <BarChart3 className="w-4 h-4" /> },
    { id: "qr", label: t("qrCodeTab"), icon: <QrCode className="w-4 h-4" /> },
    { id: "leads", label: t("leadsTab"), icon: <Inbox className="w-4 h-4" /> },
    { id: "pro", label: t("proTab"), icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#08080A] text-slate-100 flex flex-col md:flex-row relative overflow-x-clip font-sans">
      {/* Ambient Radial Purple Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30 blur-[120px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(107,33,168,0.5) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen justtap-glass border-r rtl:border-r-0 rtl:border-l border-slate-800 p-5 justify-between sticky top-0 h-screen z-30">
        <div className="space-y-8">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse px-2">
            <span className="font-display text-xl font-extrabold text-white tracking-tight">
              JustTap<span className="text-purple-500">.</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              V2
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    if (item.id === "cards" && cards.length > 0 && !editing) {
                      setEditing(false);
                    }
                  }}
                  className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-start ${
                    active
                      ? "bg-purple-700 text-white shadow-lg shadow-purple-700/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <LanguageSwitcher />

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-semibold text-amber-300 hover:text-amber-200 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t("adminPortal")}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center space-x-2 rtl:space-x-reverse text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-900 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 justtap-glass border-t border-slate-800 px-3 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                if (item.id === "cards" && cards.length > 0 && !editing) {
                  setEditing(false);
                }
              }}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                active ? "text-purple-400" : "text-slate-400"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-6xl mx-auto w-full pb-28 md:pb-12">
        {/* MOBILE TOP HEADER BAR */}
        <div className="md:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-800">
          <Link to="/" className="font-display text-lg font-bold text-white">
            JustTap<span className="text-purple-500">.</span>
          </Link>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <LanguageSwitcher />
            {isAdmin && (
              <Link
                to="/admin"
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-2 text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: CARDS MAIN DASHBOARD */}
        {tab === "cards" && (
          <div className="space-y-6">
            {!editing ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-white font-display">
                      {t("myCardsTitle")}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("myCardsSubtitle")} (
                      {cards.length.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewCard}
                    className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-700/30 flex items-center gap-2 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t("createNewCard")}</span>
                  </button>
                </div>

                {cards.length === 0 ? (
                  <div className="justtap-glass rounded-3xl p-10 text-center border border-slate-800 space-y-4 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                      <LayoutGrid className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white font-display">
                        {t("welcomeTitle")}
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed">{t("noCardDesc")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateNewCard}
                      className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-700/30 inline-flex items-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t("createMyCardBtn")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cards.map((c) => {
                      const tagStatus = tagStatusMap[c.id];
                      const isSelected = c.id === selectedCardId;
                      return (
                        <div
                          key={c.id}
                          className={`justtap-glass rounded-3xl p-5 space-y-4 border transition-all ${
                            isSelected
                              ? "border-purple-500/60 shadow-lg shadow-purple-900/20"
                              : "border-slate-800"
                          }`}
                        >
                          <div className="flex items-start justify-between space-x-3 rtl:space-x-reverse">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                              <div
                                className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 font-bold text-lg flex items-center justify-center border border-white/10"
                                style={{
                                  backgroundColor: c.accent_color || "#6B21A8",
                                  color: "#ffffff",
                                }}
                              >
                                {c.avatar_url ? (
                                  <img
                                    src={c.avatar_url}
                                    alt={c.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  c.full_name?.charAt(0) || "C"
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-white truncate">
                                  {lang === "ar" && c.full_name_ar ? c.full_name_ar : c.full_name}
                                </h3>
                                <p className="text-xs text-slate-400 truncate" dir="ltr">
                                  /c/{c.slug}
                                </p>
                              </div>
                            </div>

                            {/* Tag Status Badge */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                                tagStatus === "active" || tagStatus === "assigned"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : tagStatus === "inactive" || tagStatus === "revoked"
                                    ? "bg-red-500/10 text-red-300 border-red-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {tagStatus === "active" || tagStatus === "assigned"
                                ? t("tagLinkedBadge")
                                : tagStatus === "inactive" || tagStatus === "revoked"
                                  ? t("tagInactiveBadge")
                                  : t("digitalOnlyBadge")}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 space-y-1">
                            {c.title && (
                              <p className="truncate">
                                {t("jobTitle")}:{" "}
                                {lang === "ar" && c.title_ar ? c.title_ar : c.title}
                              </p>
                            )}
                            {c.phone && (
                              <p className="truncate" dir="ltr">
                                {t("phoneNumber")}: {c.phone}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectCardForEdit(c)}
                              className="flex-1 py-2 px-3 rounded-xl bg-purple-700/20 hover:bg-purple-700/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{t("editCard")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCardId(c.id);
                                setTab("qr");
                              }}
                              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>{t("qrCodeTab")}</span>
                            </button>

                            <a
                              href={`/c/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center justify-center transition-colors"
                              title={t("viewPublicCardTitle")}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <CardEditor
                draft={draft || emptyCard}
                setDraft={setDraft}
                userId={user?.id ?? "guest"}
                session={session}
                isNew={!cards.some((c) => c.id === draft?.id)}
                savedSlug={selectedCard?.slug}
                publishedCard={selectedCard}
                onBackToDashboard={() => setEditing(false)}
                onSaved={(saved) => {
                  setCards((prev) => {
                    const idx = prev.findIndex((c) => c.id === saved.id);
                    if (idx >= 0) {
                      const updated = [...prev];
                      updated[idx] = saved;
                      return updated;
                    }
                    return [...prev, saved];
                  });
                  setSelectedCardId(saved.id);
                  setDraft(saved);
                  setEditing(false);
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {tab === "analytics" && (
          <div>
            {selectedCard?.id ? (
              <AnalyticsTab
                key={selectedCard.id}
                cardId={selectedCard.id}
                isPro={isProEntitled(selectedCard)}
                cards={cards}
                session={session}
                onSelectCardId={(id) => {
                  setSelectedCardId(id);
                  const target = cards.find((c) => c.id === id);
                  if (target) setDraft(target);
                }}
                onNavigateToConnections={() => setTab("leads")}
                onTrialStarted={handleTrialStarted}
              />
            ) : (
              <p className="text-xs text-slate-400">{t("selectCardToViewAnalytics")}</p>
            )}
          </div>
        )}

        {/* TAB 3: QR & EXPORT */}
        {tab === "qr" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white font-display">{t("qrHubTitle")}</h1>
            {selectedCard ? (
              <QrTab
                key={selectedCard.id}
                card={selectedCard}
                session={session}
                onTrialStarted={handleTrialStarted}
              />
            ) : (
              <p className="text-xs text-slate-400">{t("selectCardToViewQr")}</p>
            )}
          </div>
        )}

        {/* TAB 4: CONNECTIONS */}
        {tab === "leads" && (
          <div>
            {selectedCard?.id ? (
              <ConnectionsTab
                key={selectedCard.id}
                cardId={selectedCard.id}
                isPro={isProEntitled(selectedCard)}
                cards={cards}
                session={session}
                onSelectCardId={(id) => {
                  setSelectedCardId(id);
                  const target = cards.find((c) => c.id === id);
                  if (target) setDraft(target);
                }}
                onTrialStarted={handleTrialStarted}
              />
            ) : (
              <p className="text-xs text-slate-400">{t("selectCardToViewConnections")}</p>
            )}
          </div>
        )}

        {/* TAB 5: PRO FEATURES */}
        {tab === "pro" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white font-display">
              {t("specialFeaturesTitle")}
            </h1>
            <TabErrorBoundary
              fallbackTitle={t("specialFeaturesEditor")}
              reloadText={t("reloadComponent")}
            >
              <ProFeaturesTab
                card={selectedCard}
                userId={user?.id ?? "guest"}
                session={session}
                onTrialStarted={handleTrialStarted}
                onChange={(updated) => {
                  setDraft(updated);
                  setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                }}
              />
            </TabErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
