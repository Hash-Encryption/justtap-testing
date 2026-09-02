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
  CreditCard,
  Trash2,
  Star,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Share2,
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
import { getUserProfile, type UserProfileData } from "@/lib/account";
import { getUserOrders, type CardOrder } from "@/lib/orders";
import { PhysicalCardCheckoutDialog } from "@/components/dashboard/PhysicalCardCheckoutDialog";
import { CardDeleteDialog } from "@/components/dashboard/CardDeleteDialog";

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
        <div className="p-8 rounded-2xl bg-red-950/20 border border-red-500/20 text-center space-y-4">
          <p className="text-red-400 font-semibold text-sm">
            {this.props.fallbackTitle || "Something went wrong loading this section."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
          >
            {this.props.reloadText || "Try Again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type Tab = "cards" | "analytics" | "qr" | "leads" | "pro";

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
    console.error("Failed to upload asset to storage:", err);
  }
  return dataUrl;
}

function DashboardPage() {
  const { user, session, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { t, lang, dir } = useTranslation();
  const navigate = useNavigate();

  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [tagStatusMap, setTagStatusMap] = useState<Record<string, string>>({});
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, string>>({});
  const [cardOrderMap, setCardOrderMap] = useState<Record<string, CardOrder>>({});
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Card | null>(null);
  const [tab, setTab] = useState<Tab>("cards");
  const [fetching, setFetching] = useState(true);

  // Dialog states
  const [checkoutCard, setCheckoutCard] = useState<Card | null>(null);
  const [deleteTargetCard, setDeleteTargetCard] = useState<Card | null>(null);

  const userId = user?.id;
  const userEmailRef = React.useRef<string | null>(null);
  userEmailRef.current = user?.email ?? null;

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, loading, navigate]);

  const loadData = async () => {
    if (!userId) return;

    // Fetch user profile
    const { data: prof } = await getUserProfile(userId);
    if (prof) setUserProfile(prof);

    // Fetch all user cards
    const { data: userCardsData } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const userCards = (userCardsData as Card[] | null) ?? [];
    setCards(userCards);

    if (userCards.length > 0 && !selectedCardId) {
      const primary = userCards.find((c) => c.is_primary) || userCards[0];
      if (primary) {
        setSelectedCardId(primary.id);
        setDraft(primary);
      }
    }

    // Fetch NFC tags
    try {
      const { data: tags } = await supabase.rpc("get_customer_card_tags");
      if (tags) {
        const sMap: Record<string, string> = {};
        const tMap: Record<string, string> = {};
        for (const tg of tags) {
          if (tg.assigned_card_id) {
            sMap[tg.assigned_card_id] = tg.status || "assigned";
            tMap[tg.assigned_card_id] = tg.token || "";
          }
        }
        setTagStatusMap(sMap);
        setTagTokenMap(tMap);
      }
    } catch {
      /* ignore RPC error */
    }

    // Fetch user orders to link active orders to cards
    const { data: orders } = await getUserOrders();
    if (orders) {
      const oMap: Record<string, CardOrder> = {};
      for (const ord of orders) {
        if (ord.card_id && ord.fulfillment_status !== "cancelled") {
          oMap[ord.card_id] = ord;
        }
      }
      setCardOrderMap(oMap);
    }

    setFetching(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (!userId) return;

      // Check guest draft to claim
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

      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      const userCards = (data as Card[] | null) ?? [];

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
            is_primary: true,
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

      void loadData();
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0] || draft || emptyCard;

  // Plan Tier and Card Limits calculation
  const isTrialActive =
    userProfile?.plan_tier === "trialing" &&
    userProfile?.trial_ends_at &&
    new Date(userProfile.trial_ends_at) > new Date();

  const effectiveTier = isTrialActive
    ? "trialing"
    : (userProfile?.plan_tier as "free" | "pro" | "enterprise") || "free";

  const maxAllowedCards =
    effectiveTier === "enterprise"
      ? 5
      : effectiveTier === "pro" || effectiveTier === "trialing"
        ? 3
        : 1;

  const isCardLimitReached = cards.length >= maxAllowedCards;

  const handleSelectCardForEdit = (targetCard: Card) => {
    setSelectedCardId(targetCard.id);
    setDraft({ ...targetCard });
    setEditing(true);
    setTab("cards");
  };

  const handleCreateNewCard = () => {
    if (isCardLimitReached) {
      toast.error(t("cardLimitReached").replace("{max}", String(maxAllowedCards)));
      return;
    }

    const newDraft: Card = {
      ...emptyCard,
      user_id: user?.id ?? "",
      full_name: "",
      phone: "",
      slug: "",
      card_name: `Card ${cards.length + 1}`,
      is_primary: cards.length === 0,
    };
    setSelectedCardId(null);
    setDraft(newDraft);
    setEditing(true);
    setTab("cards");
  };

  const handleSetPrimaryCard = async (cardId: string) => {
    const { error } = await supabase.from("cards").update({ is_primary: true }).eq("id", cardId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("primaryChanged"));
      await loadData();
    }
  };

  const handleDeleteCardConfirm = async (cardId: string) => {
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("cardDeleted"));
      await loadData();
    }
  };

  const handleOrderCreatedSuccess = (order: { order_id: string; order_number: string }) => {
    toast.success(t("orderPlacedSuccess").replace("{orderNumber}", order.order_number));
    void loadData();
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
    void loadData();
  };

  // Avatar Initials Helper
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name?.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "JT";
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
    <div
      dir={dir}
      className="min-h-screen bg-[#08080A] text-slate-100 flex flex-col md:flex-row relative overflow-x-clip font-sans"
    >
      {/* Ambient Radial Purple Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30 blur-[120px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(107,33,168,0.5) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen justtap-glass border-r rtl:border-r-0 rtl:border-l border-slate-800 p-5 justify-between sticky top-0 h-screen z-30">
        <div className="space-y-6">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse px-2">
            <span className="font-display text-xl font-extrabold text-white tracking-tight">
              JustTap<span className="text-purple-500">.</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              V2
            </span>
          </Link>

          {/* Account Profile Entry Button */}
          <Link
            to="/account"
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-all group text-start"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-950/60 border border-purple-500/40 flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:scale-105 transition-transform">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(userProfile?.full_name, user.email)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {userProfile?.full_name || user.email?.split("@")[0]}
              </div>
              <div className="text-[10px] text-purple-400 font-medium truncate">
                {t("accountCenter")} →
              </div>
            </div>
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
                  className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-2xl text-xs font-bold transition-all text-start ${
                    active
                      ? "bg-purple-700/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-900/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-slate-500 font-mono">
              {cards.length} / {maxAllowedCards} cards
            </span>
            <LanguageSwitcher />
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t("adminPortal")}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors"
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
        <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
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
            {/* Mobile Avatar Button -> /account */}
            <Link
              to="/account"
              className="w-8 h-8 rounded-full overflow-hidden bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-white shrink-0"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(userProfile?.full_name, user.email)}</span>
              )}
            </Link>
          </div>
        </div>

        {/* TAB 1: CARDS MAIN DASHBOARD */}
        {tab === "cards" && (
          <div className="space-y-6">
            {!editing ? (
              <div className="space-y-6">
                {/* Header & Limits Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-white font-display">
                      {t("myCardsTitle")}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("cardsCount")
                        .replace("{current}", String(cards.length))
                        .replace("{max}", String(maxAllowedCards))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewCard}
                    disabled={isCardLimitReached}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all self-start sm:self-auto ${
                      isCardLimitReached
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                        : "bg-purple-700 hover:bg-purple-600 text-white shadow-purple-700/30"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t("createNewCard")}</span>
                  </button>
                </div>

                {/* Recommended Next Step Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-purple-900/10 border border-purple-500/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-200">
                        {t("recommendedNextStep")}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {cards.length === 0
                          ? t("recAddCard")
                          : Object.keys(cardOrderMap).length === 0
                            ? t("recOrderNfc")
                            : t("recShareCard")}
                      </div>
                    </div>
                  </div>
                  {cards.length > 0 && Object.keys(cardOrderMap).length === 0 && (
                    <button
                      type="button"
                      onClick={() => setCheckoutCard(cards.find((c) => c.is_primary) || cards[0])}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 transition-colors"
                    >
                      {t("orderPhysicalCard")}
                    </button>
                  )}
                </div>

                {/* Cards Container: Desktop Grid + Mobile Native CSS Scroll-Snap */}
                {cards.length === 0 ? (
                  /* 0-Card Onboarding State */
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
                  <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 scrollbar-none">
                    {cards.map((c) => {
                      const tagStatus = tagStatusMap[c.id];
                      const tagToken = tagTokenMap[c.id];
                      const activeOrder = cardOrderMap[c.id];
                      const isSelected = c.id === selectedCardId;
                      const isPlanLocked =
                        effectiveTier === "free" && !c.is_primary && cards.length > 1;

                      return (
                        <div
                          key={c.id}
                          className={`min-w-[85vw] sm:min-w-[340px] md:min-w-0 snap-center shrink-0 justtap-glass rounded-3xl p-5 space-y-4 border transition-all flex flex-col justify-between ${
                            isSelected
                              ? "border-purple-500/60 shadow-lg shadow-purple-900/20"
                              : "border-slate-800"
                          } ${isPlanLocked ? "opacity-75" : ""}`}
                        >
                          <div className="space-y-4">
                            {/* Card Header & Badges */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
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
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="text-base font-bold text-white truncate">
                                      {c.card_name ||
                                        (lang === "ar" && c.full_name_ar
                                          ? c.full_name_ar
                                          : c.full_name) ||
                                        "Personal Card"}
                                    </h3>
                                    {c.is_primary && (
                                      <span title={t("primaryCard")} className="text-amber-400">
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 truncate" dir="ltr">
                                    /c/{c.slug}
                                  </p>
                                </div>
                              </div>

                              {/* Primary & Locked Badges */}
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {c.is_primary && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    {t("primaryCard")}
                                  </span>
                                )}
                                {isPlanLocked && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                                    {t("planLockedBadge")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bio / Details */}
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

                            {/* Physical NFC / Order Status Line */}
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                <span>Physical NFC:</span>
                              </span>
                              {tagStatus === "active" || tagStatus === "assigned" ? (
                                <span className="font-semibold text-emerald-400">
                                  {t("nfcLinkedActive")}
                                </span>
                              ) : activeOrder ? (
                                <span className="font-semibold text-purple-300">
                                  {activeOrder.order_number} ({activeOrder.fulfillment_status})
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCheckoutCard(c)}
                                  className="text-purple-400 hover:text-purple-300 font-bold underline"
                                >
                                  {t("orderPhysicalCard")}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions Footer */}
                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectCardForEdit(c)}
                              className="flex-1 py-2 px-2.5 rounded-xl bg-purple-700/20 hover:bg-purple-700/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
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
                              className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              title={t("qrCodeTab")}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {!c.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryCard(c.id)}
                                className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-bold flex items-center justify-center transition-colors"
                                title={t("setAsPrimary")}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={`/c/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center justify-center transition-colors"
                              title={t("viewPublicCardTitle")}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => setDeleteTargetCard(c)}
                              className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs flex items-center justify-center transition-colors"
                              title={t("delete")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                onBackToDashboard={() => {
                  setEditing(false);
                  void loadData();
                }}
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
                  toast.success(t("cardPublishedToast"));
                  void loadData();
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {tab === "analytics" && (
          <TabErrorBoundary
            fallbackTitle="Something went wrong loading analytics."
            reloadText="Try Again"
          >
            <AnalyticsTab
              key={selectedCard.id}
              cardId={selectedCard.id}
              isPro={isProEntitled(selectedCard)}
              cards={cards}
              onSelectCardId={(id) => {
                setSelectedCardId(id);
                const target = cards.find((c) => c.id === id);
                if (target) setDraft(target);
              }}
              onNavigateToConnections={() => setTab("leads")}
              session={session}
              onTrialStarted={handleTrialStarted}
            />
          </TabErrorBoundary>
        )}

        {/* TAB 3: QR CODE & WALLPAPER */}
        {tab === "qr" && (
          <TabErrorBoundary
            fallbackTitle="Something went wrong loading QR code."
            reloadText="Try Again"
          >
            <QrTab card={selectedCard} session={session} onTrialStarted={handleTrialStarted} />
          </TabErrorBoundary>
        )}

        {/* TAB 4: LEADS & CONNECTIONS */}
        {tab === "leads" && (
          <TabErrorBoundary
            fallbackTitle="Something went wrong loading connections."
            reloadText="Try Again"
          >
            <ConnectionsTab
              cardId={selectedCard.id}
              isPro={isProEntitled(selectedCard)}
              cards={cards}
              onSelectCardId={(id) => {
                setSelectedCardId(id);
                const target = cards.find((c) => c.id === id);
                if (target) setDraft(target);
              }}
              session={session}
              onTrialStarted={handleTrialStarted}
            />
          </TabErrorBoundary>
        )}

        {/* TAB 5: PRO FEATURES */}
        {tab === "pro" && (
          <TabErrorBoundary
            fallbackTitle="Something went wrong loading Pro features."
            reloadText="Try Again"
          >
            <ProFeaturesTab
              card={selectedCard}
              userId={user.id}
              session={session}
              onChange={(updated) => {
                setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                setDraft(updated);
              }}
              onTrialStarted={handleTrialStarted}
            />
          </TabErrorBoundary>
        )}
      </main>

      {/* Physical Card Checkout Modal */}
      {checkoutCard && (
        <PhysicalCardCheckoutDialog
          card={checkoutCard}
          isOpen={!!checkoutCard}
          onClose={() => setCheckoutCard(null)}
          onOrderCreated={handleOrderCreatedSuccess}
        />
      )}

      {/* Safe Card Delete Modal */}
      {deleteTargetCard && (
        <CardDeleteDialog
          card={deleteTargetCard}
          linkedNfcToken={tagTokenMap[deleteTargetCard.id] || null}
          isOpen={!!deleteTargetCard}
          onClose={() => setDeleteTargetCard(null)}
          onConfirmDelete={handleDeleteCardConfirm}
        />
      )}
    </div>
  );
}
