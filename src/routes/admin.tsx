import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  History,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { slugify, type PlanTier } from "@/lib/card";
import { slugValidationMessage, validateSlug } from "@/lib/slug";
import {
  adminAssignNfcTag,
  adminCreateCard,
  adminCreateProfile,
  adminDeleteCard,
  adminDeleteProfile,
  adminProvisionNfcTag,
  adminSetCardActive,
  adminSetEntitlement,
  adminUpdateTagStatus,
  getOperations,
  getUserDetail,
  maskNfcToken,
  type AdminAuditRow,
  type AdminCardRow,
  type AdminUserRow,
  type OperationsData,
  type UserDetailData,
} from "@/lib/operations";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin operations portal — JustTap" },
      {
        name: "description",
        content:
          "Operations overview, client accounts, card lifecycle, product analytics, and audit log.",
      },
    ],
  }),
  component: AdminPage,
});

type TabType = "overview" | "users" | "cards" | "connections" | "analytics" | "audit" | "nfc";

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { t, dir } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "365d">("30d");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "trial" | "pro" | "enterprise">(
    "all",
  );
  const [activationFilter, setActivationFilter] = useState<"all" | "activated" | "not_activated">(
    "all",
  );
  const [cardStatusFilter, setCardStatusFilter] = useState<"all" | "live" | "inactive">("all");

  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User detail drawer/modal state
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Mutation safeguard modals
  const [entitlementModal, setEntitlementModal] = useState<{
    user: AdminUserRow;
    newTier: string;
    reason: string;
    submitting: boolean;
  } | null>(null);

  const [cardActiveModal, setCardActiveModal] = useState<{
    card: AdminCardRow;
    nextActive: boolean;
    reason: string;
    submitting: boolean;
  } | null>(null);

  const [deleteCardModal, setDeleteCardModal] = useState<{
    card: AdminCardRow;
    confirmSlug: string;
    reason: string;
    submitting: boolean;
  } | null>(null);

  const [deleteProfileModal, setDeleteProfileModal] = useState<{
    user: AdminUserRow;
    confirmEmail: string;
    reason: string;
    submitting: boolean;
  } | null>(null);

  const [nfcAssignModal, setNfcAssignModal] = useState<{
    token: string;
    targetCardId: string;
    submitting: boolean;
  } | null>(null);

  const [nfcRevokeModal, setNfcRevokeModal] = useState<{
    token: string;
    submitting: boolean;
  } | null>(null);

  // Create Profile form state
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileEmail, setNewProfileEmail] = useState("");
  const [newProfilePhone, setNewProfilePhone] = useState("");
  const [newProfileTier, setNewProfileTier] = useState<PlanTier>("free");
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Create Card form state
  const [newCardUserId, setNewCardUserId] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newCardSlug, setNewCardSlug] = useState("");
  const [newCardPhone, setNewCardPhone] = useState("");
  const [newCardActive, setNewCardActive] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);

  // NFC Provision state
  const [provisionCardId, setProvisionCardId] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setFetching(true);

      const days =
        dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : dateRange === "365d" ? 365 : 30;
      const start = new Date(Date.now() - days * 86400000).toISOString();
      const end = new Date().toISOString();

      const res = await getOperations({
        rangeStart: start,
        rangeEnd: end,
        search: searchQuery.trim() || undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        setOperations(res.data);
      }

      setFetching(false);
      setRefreshing(false);
    },
    [dateRange, searchQuery],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin, loadData]);

  // Load user support detail
  const handleOpenUserDetail = useCallback(async (userId: string) => {
    setDetailUserId(userId);
    setLoadingDetail(true);
    const res = await getUserDetail(userId);
    setLoadingDetail(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUserDetail(res.data);
    }
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!operations?.users) return [];
    return operations.users.filter((u) => {
      if (tierFilter !== "all" && u.plan_tier !== tierFilter) return false;
      if (activationFilter === "activated" && !u.activated) return false;
      if (activationFilter === "not_activated" && u.activated) return false;
      return true;
    });
  }, [operations?.users, tierFilter, activationFilter]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    if (!operations?.cards) return [];
    return operations.cards.filter((c) => {
      if (cardStatusFilter === "live" && !c.is_active) return false;
      if (cardStatusFilter === "inactive" && c.is_active) return false;
      if (tierFilter !== "all" && c.plan_tier !== tierFilter) return false;
      return true;
    });
  }, [operations?.cards, cardStatusFilter, tierFilter]);

  // --- Handlers for Mutations ---

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newProfileName.trim() || !newProfileEmail.trim()) {
      toast.error("Full name and email are required");
      return;
    }
    setCreatingProfile(true);
    const res = await adminCreateProfile({
      fullName: newProfileName,
      email: newProfileEmail,
      phone: newProfilePhone || undefined,
      planTier: newProfileTier,
    });
    setCreatingProfile(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Client profile created! ID: ${res.data}`);
    setNewProfileName("");
    setNewProfileEmail("");
    setNewProfilePhone("");
    void loadData(true);
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardUserId.trim() || !newCardName.trim()) {
      toast.error("Owner profile and card name are required");
      return;
    }
    const slugCheck = validateSlug(newCardSlug || newCardName);
    if (!slugCheck.valid) {
      toast.error(slugValidationMessage(slugCheck));
      return;
    }

    setCreatingCard(true);
    const res = await adminCreateCard({
      userId: newCardUserId,
      slug: slugCheck.slug,
      fullName: newCardName,
      phone: newCardPhone || "-",
      isActive: newCardActive,
    });
    setCreatingCard(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Card created: /c/${slugCheck.slug}`);
    setNewCardName("");
    setNewCardSlug("");
    setNewCardPhone("");
    setNewCardUserId("");
    setNewCardActive(false);
    void loadData(true);
  }

  async function handleConfirmEntitlement() {
    if (!entitlementModal) return;
    if (!entitlementModal.reason.trim()) {
      toast.error(t("adminReasonMissingError"));
      return;
    }

    setEntitlementModal((prev) => (prev ? { ...prev, submitting: true } : null));
    const res = await adminSetEntitlement({
      userId: entitlementModal.user.user_id || entitlementModal.user.id,
      planTier: entitlementModal.newTier,
      reason: entitlementModal.reason,
    });

    if (res.error) {
      toast.error(res.error);
      setEntitlementModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success(`Entitlement changed to ${entitlementModal.newTier.toUpperCase()}`);
    setEntitlementModal(null);
    void loadData(true);
  }

  async function handleConfirmCardActive() {
    if (!cardActiveModal) return;
    if (!cardActiveModal.reason.trim()) {
      toast.error(t("adminReasonMissingError"));
      return;
    }

    setCardActiveModal((prev) => (prev ? { ...prev, submitting: true } : null));
    const res = await adminSetCardActive({
      cardId: cardActiveModal.card.id,
      isActive: cardActiveModal.nextActive,
      reason: cardActiveModal.reason,
    });

    if (res.error) {
      toast.error(res.error);
      setCardActiveModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success(cardActiveModal.nextActive ? "Card published and active" : "Card deactivated");
    setCardActiveModal(null);
    void loadData(true);
  }

  async function handleConfirmDeleteCard() {
    if (!deleteCardModal) return;
    if (
      deleteCardModal.confirmSlug.trim().toLowerCase() !== deleteCardModal.card.slug.toLowerCase()
    ) {
      toast.error(t("adminMismatchError"));
      return;
    }
    if (!deleteCardModal.reason.trim()) {
      toast.error(t("adminReasonMissingError"));
      return;
    }

    setDeleteCardModal((prev) => (prev ? { ...prev, submitting: true } : null));
    const res = await adminDeleteCard({
      cardId: deleteCardModal.card.id,
      confirmationSlug: deleteCardModal.confirmSlug,
      reason: deleteCardModal.reason,
    });

    if (res.error) {
      toast.error(res.error);
      setDeleteCardModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success("Card deleted permanently");
    setDeleteCardModal(null);
    void loadData(true);
  }

  async function handleConfirmDeleteProfile() {
    if (!deleteProfileModal) return;
    if (
      deleteProfileModal.confirmEmail.trim().toLowerCase() !==
      deleteProfileModal.user.email.toLowerCase()
    ) {
      toast.error(t("adminMismatchError"));
      return;
    }
    if (!deleteProfileModal.reason.trim()) {
      toast.error(t("adminReasonMissingError"));
      return;
    }

    setDeleteProfileModal((prev) => (prev ? { ...prev, submitting: true } : null));
    const res = await adminDeleteProfile({
      profileId: deleteProfileModal.user.id,
      confirmationEmail: deleteProfileModal.confirmEmail,
      reason: deleteProfileModal.reason,
    });

    if (res.error) {
      toast.error(res.error);
      setDeleteProfileModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success("Profile deleted");
    setDeleteProfileModal(null);
    void loadData(true);
  }

  async function handleProvisionNfc() {
    setProvisioning(true);
    const res = await adminProvisionNfcTag({
      cardId: provisionCardId.trim() || undefined,
    });
    setProvisioning(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`NFC tag provisioned: ${maskNfcToken(res.data?.token)}`);
    setProvisionCardId("");
    void loadData(true);
  }

  async function handleConfirmAssignNfc() {
    if (!nfcAssignModal) return;
    if (!nfcAssignModal.targetCardId) {
      toast.error("Please select a target card");
      return;
    }

    setNfcAssignModal((prev) => (prev ? { ...prev, submitting: true } : null));
    const res = await adminAssignNfcTag({
      token: nfcAssignModal.token,
      cardId: nfcAssignModal.targetCardId,
    });

    if (res.error) {
      toast.error(res.error);
      setNfcAssignModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success("NFC tag assigned successfully");
    setNfcAssignModal(null);
    void loadData(true);
  }

  async function handleConfirmRevokeNfc() {
    if (!nfcRevokeModal) return;
    setNfcRevokeModal((prev) => (prev ? { ...prev, submitting: true } : null));

    const res = await adminUpdateTagStatus({
      token: nfcRevokeModal.token,
      status: "revoked",
    });

    if (res.error) {
      toast.error(res.error);
      setNfcRevokeModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success("NFC tag permanently revoked");
    setNfcRevokeModal(null);
    void loadData(true);
  }

  // --- Render Authorization Boundaries ---

  if (authLoading || isAdmin === null) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background"
        role="status"
        aria-label={t("pleaseWait")}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t("pleaseWait")}</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Visitor
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-12 bg-background" dir={dir}>
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {t("adminSignInRequiredTitle")}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {t("adminSignInRequiredDesc")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t("signIn")}
            </button>
            <Link
              to="/"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors"
            >
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 2. Authenticated Non-Admin Visitor (403 Forbidden)
  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-12 bg-background" dir={dir}>
        <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {t("adminAccessDeniedTitle")}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {t("adminAccessDeniedDesc")}
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t("adminReturnToDashboard")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 3. Authorized Admin Portal Surface
  const overview = operations?.overview;
  const productAnalytics = operations?.product_analytics;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                  {t("adminTitle")}
                </h1>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/25">
                  OPERATOR
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t("adminSubtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <LanguageSwitcher />

            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              aria-label="Refresh data"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-xs font-semibold text-secondary-foreground hover:opacity-90 transition-opacity"
            >
              <Users className="h-3.5 w-3.5" />
              <span>{t("myDashboard")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-6 space-y-6">
        {/* Controls Bar: Search & Date Range */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("adminSearchPlaceholder")}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 rtl:pl-4 rtl:pr-9 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 self-start sm:self-auto text-xs font-semibold">
            {(["7d", "30d", "90d", "365d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  dateRange === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "7d"
                  ? t("adminDateRange7d")
                  : r === "30d"
                    ? t("adminDateRange30d")
                    : r === "90d"
                      ? t("adminDateRange90d")
                      : t("adminDateRange365d")}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border overflow-x-auto scrollbar-none">
          <nav className="flex gap-1 min-w-max pb-px" role="tablist">
            {(
              [
                { id: "overview", label: t("adminTabOverview"), icon: Activity },
                { id: "users", label: t("adminTabUsers"), icon: Users },
                { id: "cards", label: t("adminTabCards"), icon: CreditCard },
                { id: "connections", label: t("adminTabConnections"), icon: UserCheck },
                { id: "analytics", label: t("adminTabAnalytics"), icon: BarChart3 },
                { id: "audit", label: t("adminTabAudit"), icon: History },
                { id: "nfc", label: t("adminTabNfc"), icon: Tag },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                    isSelected
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: OPERATIONS OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {fetching ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-muted/60" />
                ))}
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminTotalUsers")}
                    </span>
                    <span className="font-display text-2xl font-bold text-foreground mt-1 block">
                      {overview.total_users}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminNewUsers")}
                    </span>
                    <span className="font-display text-2xl font-bold text-emerald-500 mt-1 block">
                      +{overview.new_users}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminActivatedUsers")}
                    </span>
                    <span className="font-display text-2xl font-bold text-foreground mt-1 block">
                      {overview.activated_users}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminLiveCards")}
                    </span>
                    <span className="font-display text-2xl font-bold text-primary mt-1 block">
                      {overview.live_cards}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminInactiveCards")}
                    </span>
                    <span className="font-display text-2xl font-bold text-muted-foreground mt-1 block">
                      {overview.inactive_cards}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminConnectionsPeriod")}
                    </span>
                    <span className="font-display text-2xl font-bold text-indigo-500 mt-1 block">
                      {overview.connections}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminTrialsEndingSoon")}
                    </span>
                    <span className="font-display text-2xl font-bold text-amber-500 mt-1 block">
                      {overview.trials_ending_soon}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {t("adminTierDistribution")}
                    </span>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        Free: {overview.tier_distribution.free || 0}
                      </span>
                      <span className="rounded bg-amber-500/20 text-amber-600 px-1.5 py-0.5">
                        Trial: {overview.tier_distribution.trialing || 0}
                      </span>
                      <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5">
                        Pro: {overview.tier_distribution.pro || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    Operations Quick Actions
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("users")}
                      className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                      <span>{t("adminCreateProfileTitle")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cards")}
                      className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <span>{t("adminCreateCardTitle")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("nfc")}
                      className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors flex items-center gap-1.5"
                    >
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span>{t("adminNfcProvisionTitle")}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: CLIENT PROFILES */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Create Profile Section */}
            <form
              onSubmit={handleCreateProfile}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <UserPlus className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  {t("adminCreateProfileTitle")}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Full Name *"
                  required
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                />
                <input
                  type="email"
                  value={newProfileEmail}
                  onChange={(e) => setNewProfileEmail(e.target.value)}
                  placeholder="client@company.com *"
                  required
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                />
                <input
                  type="tel"
                  value={newProfilePhone}
                  onChange={(e) => setNewProfilePhone(e.target.value)}
                  placeholder="Phone (+966...)"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                />
                <select
                  value={newProfileTier}
                  onChange={(e) => setNewProfileTier(e.target.value as PlanTier)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  <option value="free">Free Tier</option>
                  <option value="pro">Pro Tier</option>
                  <option value="enterprise">Enterprise Tier</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingProfile}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {creatingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>{t("adminCreateProfileBtn")}</span>
                </button>
              </div>
            </form>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {(["all", "free", "trial", "pro", "enterprise"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTierFilter(tf)}
                  className={`rounded-lg px-2.5 py-1 capitalize ${
                    tierFilter === tf
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className="h-4 w-px bg-border mx-1" />
              {(["all", "activated", "not_activated"] as const).map((af) => (
                <button
                  key={af}
                  type="button"
                  onClick={() => setActivationFilter(af)}
                  className={`rounded-lg px-2.5 py-1 ${
                    activationFilter === af
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  {af === "all"
                    ? t("adminAllFilter")
                    : af === "activated"
                      ? t("adminActivatedFilter")
                      : t("adminNotActivatedFilter")}
                </button>
              ))}
            </div>

            {/* Profiles Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">{t("adminUserNameCol")}</th>
                      <th className="px-4 py-3">{t("adminUserCardsCol")}</th>
                      <th className="px-4 py-3">{t("adminUserConnectionsCol")}</th>
                      <th className="px-4 py-3">{t("adminUserTierCol")}</th>
                      <th className="px-4 py-3">{t("adminUserTrialCol")}</th>
                      <th className="px-4 py-3">{t("adminUserCreatedCol")}</th>
                      <th className="px-4 py-3 text-right rtl:text-left">
                        {t("adminUserActionsCol")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          {t("adminNoUsersFound")}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{u.full_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground">
                              {u.live_card_count}
                            </span>
                            <span className="text-muted-foreground"> / {u.card_count}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {u.connections_count}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                u.plan_tier === "pro"
                                  ? "bg-primary/20 text-primary"
                                  : u.plan_tier === "enterprise"
                                    ? "bg-purple-500/20 text-purple-600"
                                    : u.plan_tier === "trialing"
                                      ? "bg-amber-500/20 text-amber-600"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {u.plan_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px]">
                            {u.trial_ends_at ? (
                              <span className="text-muted-foreground font-mono">
                                Ends: {new Date(u.trial_ends_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right rtl:text-left space-x-1.5 rtl:space-x-reverse whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleOpenUserDetail(u.user_id || u.id)}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-accent transition-colors"
                            >
                              {t("adminViewUserDetail")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEntitlementModal({
                                  user: u,
                                  newTier: u.plan_tier === "pro" ? "free" : "pro",
                                  reason: "",
                                  submitting: false,
                                })
                              }
                              className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                            >
                              {t("adminChangeEntitlement")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteProfileModal({
                                  user: u,
                                  confirmEmail: "",
                                  reason: "",
                                  submitting: false,
                                })
                              }
                              className="rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                              title={t("adminDeleteProfile")}
                            >
                              <Trash2 className="h-3 w-3 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL CARDS */}
        {activeTab === "cards" && (
          <div className="space-y-6">
            {/* Create Card Form */}
            <form
              onSubmit={handleCreateCard}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  {t("adminCreateCardTitle")}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={newCardUserId}
                  onChange={(e) => {
                    setNewCardUserId(e.target.value);
                    const selUser = operations?.users.find((u) => u.user_id === e.target.value);
                    if (selUser) {
                      setNewCardName(selUser.full_name);
                      setNewCardSlug(slugify(selUser.full_name));
                      setNewCardPhone(selUser.phone || "");
                    }
                  }}
                  required
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  <option value="">-- Select Client Owner * --</option>
                  {operations?.users.map((u) => (
                    <option key={u.id} value={u.user_id || u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => {
                    setNewCardName(e.target.value);
                    if (!newCardSlug) setNewCardSlug(slugify(e.target.value));
                  }}
                  placeholder="Card Name *"
                  required
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                />

                <input
                  type="text"
                  value={newCardSlug}
                  onChange={(e) => setNewCardSlug(e.target.value)}
                  placeholder="slug-name *"
                  required
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-mono focus:ring-2 focus:ring-primary/40 outline-none"
                />

                <div className="flex items-center gap-3">
                  <input
                    type="tel"
                    value={newCardPhone}
                    onChange={(e) => setNewCardPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCardActive}
                      onChange={(e) => setNewCardActive(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Live</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingCard}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {creatingCard ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>{t("adminCreateCardBtn")}</span>
                </button>
              </div>
            </form>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {(["all", "live", "inactive"] as const).map((cs) => (
                <button
                  key={cs}
                  type="button"
                  onClick={() => setCardStatusFilter(cs)}
                  className={`rounded-lg px-2.5 py-1 capitalize ${
                    cardStatusFilter === cs
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  {cs}
                </button>
              ))}
            </div>

            {/* Cards Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">{t("adminCardOwnerCol")}</th>
                      <th className="px-4 py-3">{t("adminCardNameCol")}</th>
                      <th className="px-4 py-3">{t("adminCardTimestampsCol")}</th>
                      <th className="px-4 py-3">{t("adminCardStatusCol")}</th>
                      <th className="px-4 py-3">{t("adminCardStatsCol")}</th>
                      <th className="px-4 py-3">{t("adminCardNfcCol")}</th>
                      <th className="px-4 py-3 text-right rtl:text-left">
                        {t("adminCardActionsCol")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCards.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          {t("adminNoCardsMatch")}
                        </td>
                      </tr>
                    ) : (
                      filteredCards.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">
                              {c.owner_name || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {c.owner_email || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{c.full_name}</span>
                              {c.enable_arabic && (
                                <span className="rounded bg-emerald-500/15 text-emerald-600 px-1 py-0.2 text-[9px] font-bold">
                                  AR
                                </span>
                              )}
                            </div>
                            <a
                              href={`/c/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline font-mono inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>/c/{c.slug}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground space-y-0.5">
                            <div>
                              <span className="font-medium text-foreground">Published: </span>
                              {c.published_at ? (
                                <span className="font-mono">
                                  {new Date(c.published_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="italic text-[10px] text-amber-500/90">
                                  {t("adminNotTrackedYet")}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Updated: </span>
                              {c.updated_at ? (
                                <span className="font-mono">
                                  {new Date(c.updated_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="italic text-[10px]">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                c.is_active
                                  ? "bg-emerald-500/20 text-emerald-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {c.is_active ? "LIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px]">
                            <div className="font-mono font-semibold text-foreground">
                              {c.views} / {c.contact_saves} / {c.connections_count}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono">
                            {maskNfcToken(c.active_nfc_token)}
                          </td>
                          <td className="px-4 py-3 text-right rtl:text-left space-x-1.5 rtl:space-x-reverse whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                setCardActiveModal({
                                  card: c,
                                  nextActive: !c.is_active,
                                  reason: "",
                                  submitting: false,
                                })
                              }
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                c.is_active
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              }`}
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteCardModal({
                                  card: c,
                                  confirmSlug: "",
                                  reason: "",
                                  submitting: false,
                                })
                              }
                              className="rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                              title={t("adminDeleteCardBtn")}
                            >
                              <Trash2 className="h-3 w-3 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONNECTIONS SUMMARY */}
        {activeTab === "connections" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                <h2 className="font-display text-base font-bold text-foreground">
                  {t("adminConnectionsTitle")}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <span className="text-xs text-muted-foreground font-medium block">
                    {t("adminConnectionsTotal")}
                  </span>
                  <span className="font-display text-3xl font-bold text-indigo-500 mt-1 block">
                    {overview?.connections ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Period Comparison
                  </span>
                  <span className="text-xs text-muted-foreground italic mt-2 block">
                    {t("adminComparisonUnavailable")}
                  </span>
                </div>
              </div>

              {/* Privacy Notice Banner */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t("adminConnectionsNotice")}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPER ADMIN ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Header & Date Range Control */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {t("adminProductAnalyticsTitle")}
                    </h2>
                    {productAnalytics?.collection_started ? (
                      <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-purple-300 border border-purple-500/20">
                        {t("adminCollectionStarted")}:{" "}
                        {new Date(productAnalytics.collection_started).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                        {t("adminNotTrackedYet")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("adminAnalyticsDesc")}</p>
                </div>
              </div>

              {/* Date Range Selector Pills */}
              <div
                className="flex items-center gap-1 rounded-xl bg-background/80 p-1 border border-border self-start sm:self-auto shrink-0"
                role="group"
                aria-label="Date range selector"
              >
                {(["7d", "30d", "90d", "365d"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDateRange(r)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      dateRange === r
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "7d" ? "7D" : r === "30d" ? "30D" : r === "90d" ? "90D" : "1Y"}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t("adminDau")}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <span className="font-display text-2xl font-bold text-foreground mt-2 block tabular-nums">
                  {productAnalytics?.dau ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {t("adminWau")}: {productAnalytics?.wau ?? 0}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t("adminMau")}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <span className="font-display text-2xl font-bold text-foreground mt-2 block tabular-nums">
                  {productAnalytics?.mau ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {t("adminTotalUsers")}: {overview?.total_users ?? 0}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("adminNewUsers")}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <UserPlus className="h-4 w-4" />
                  </div>
                </div>
                <span className="font-display text-2xl font-bold text-foreground mt-2 block tabular-nums">
                  {overview?.new_users ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {t("adminActivatedUsers")}: {overview?.activated_users ?? 0}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("adminLiveCards")}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <span className="font-display text-2xl font-bold text-foreground mt-2 block tabular-nums">
                  {overview?.live_cards ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {t("adminInactiveCards")}: {overview?.inactive_cards ?? 0}
                </span>
              </div>
            </div>

            {/* Secondary KPIs (Cards created, published, trial starts, trials ending soon) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {t("adminStageCardCreated")}
                </span>
                <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                  {productAnalytics?.events.card_created ?? 0}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {t("adminStageCardPublished")}
                </span>
                <span className="font-display text-lg font-bold text-emerald-400 mt-1 block tabular-nums">
                  {productAnalytics?.events.card_published ?? 0}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {t("adminStageTrialStarted")}
                </span>
                <span className="font-display text-lg font-bold text-purple-400 mt-1 block tabular-nums">
                  {productAnalytics?.events.trial_started ?? 0}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {t("adminTrialsEndingSoon")}
                </span>
                <span className="font-display text-lg font-bold text-amber-400 mt-1 block tabular-nums">
                  {overview?.trials_ending_soon ?? 0}
                </span>
              </div>
            </div>

            {/* Product Journey & Funnel (Event Occurrences) */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t("adminFunnelStages")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tracked event occurrences across the customer onboarding and conversion
                    lifecycle.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Stage 1: Signup */}
                <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stage 1
                      </span>
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground mt-2 block">
                      {t("adminStageSignup")}
                    </span>
                  </div>
                  <span className="font-display text-2xl font-bold text-foreground mt-3 block tabular-nums">
                    {productAnalytics?.events.signup_completed ?? 0}
                  </span>
                </div>

                {/* Stage 2: Card Created */}
                <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stage 2
                      </span>
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground mt-2 block">
                      {t("adminStageCardCreated")}
                    </span>
                  </div>
                  <span className="font-display text-2xl font-bold text-foreground mt-3 block tabular-nums">
                    {productAnalytics?.events.card_created ?? 0}
                  </span>
                </div>

                {/* Stage 3: Card Published */}
                <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stage 3
                      </span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-foreground mt-2 block">
                      {t("adminStageCardPublished")}
                    </span>
                  </div>
                  <span className="font-display text-2xl font-bold text-emerald-400 mt-3 block tabular-nums">
                    {productAnalytics?.events.card_published ?? 0}
                  </span>
                </div>

                {/* Stage 4: Trial Started */}
                <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Stage 4
                      </span>
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-foreground mt-2 block">
                      {t("adminStageTrialStarted")}
                    </span>
                  </div>
                  <span className="font-display text-2xl font-bold text-purple-400 mt-3 block tabular-nums">
                    {productAnalytics?.events.trial_started ?? 0}
                  </span>
                </div>

                {/* Stage 5: Paid Upgrade (Unavailable) */}
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 flex flex-col justify-between opacity-75">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stage 5
                      </span>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground mt-2 block">
                      {t("adminStagePaidUpgrade")}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic leading-snug mt-3">
                    {t("adminStageUnavailableNotice")}
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdowns Row: Tier Distribution & Feature Adoption */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Tier Distribution */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {t("adminTierDistribution")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Current breakdown of client accounts by entitlement tier.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      key: "free",
                      label: t("adminTierFree"),
                      count: overview?.tier_distribution.free ?? 0,
                      color: "bg-slate-400",
                    },
                    {
                      key: "trialing",
                      label: t("adminTierTrial"),
                      count: overview?.tier_distribution.trialing ?? 0,
                      color: "bg-purple-500",
                    },
                    {
                      key: "pro",
                      label: t("adminTierPro"),
                      count: overview?.tier_distribution.pro ?? 0,
                      color: "bg-emerald-500",
                    },
                    {
                      key: "enterprise",
                      label: t("adminTierEnterprise"),
                      count: overview?.tier_distribution.enterprise ?? 0,
                      color: "bg-sky-500",
                    },
                  ].map((tier) => {
                    const total = overview?.total_users || 1;
                    const pct = Math.round((tier.count / total) * 100);
                    return (
                      <div key={tier.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{tier.label}</span>
                          <span className="font-mono text-muted-foreground">
                            {tier.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${tier.color} transition-all duration-300`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Feature Adoption & Pro Preview */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {t("adminAnalyticsBreakdownTitle")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Engagement with features, pro preview, and upgrade interactions.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t("adminAnalyticsFeatureAdoption")}
                    </span>
                    <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                      {productAnalytics?.events.feature_used ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Pro Feature Views
                    </span>
                    <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                      {productAnalytics?.events.pro_feature_view ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Pro Previews Started
                    </span>
                    <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                      {productAnalytics?.events.pro_preview_started ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Pro Previews Configured
                    </span>
                    <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                      {productAnalytics?.events.pro_preview_configured ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Pro Preview Interactions
                    </span>
                    <span className="font-display text-lg font-bold text-foreground mt-1 block tabular-nums">
                      {productAnalytics?.events.pro_preview_interaction ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t("adminAnalyticsGenuineUpgradeIntent")}
                    </span>
                    <span className="font-display text-lg font-bold text-amber-400 mt-1 block tabular-nums">
                      {productAnalytics?.events.pro_upgrade_clicked ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block italic truncate">
                      (Checkout disabled in testing)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Distribution Summary */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t("adminEventDistribution")} ({dateRange})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Total recorded occurrences across all allowlisted product event types.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(productAnalytics?.events || {}).map(([name, count]) => (
                  <div key={name} className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[10px] font-mono text-muted-foreground block truncate">
                      {name}
                    </span>
                    <span className="font-display text-base font-bold text-foreground mt-0.5 block tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Events Stream Table */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t("adminRecentEventsStream")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Latest telemetry events captured in `product_events` table.
                  </p>
                </div>
              </div>

              {(productAnalytics?.recent || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <Activity className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("adminAnalyticsNoRecentEvents")}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground uppercase sticky top-0">
                        <tr>
                          <th className="px-3.5 py-2.5">{t("adminEventNameCol")}</th>
                          <th className="px-3.5 py-2.5">{t("adminEventFeatureCol")}</th>
                          <th className="px-3.5 py-2.5">{t("adminEventSourceCol")}</th>
                          <th className="px-3.5 py-2.5 text-right rtl:text-left">
                            {t("adminEventTimeCol")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(productAnalytics?.recent || []).map((e) => (
                          <tr
                            key={e.id}
                            className="hover:bg-muted/30 transition-colors font-mono text-[11px]"
                          >
                            <td className="px-3.5 py-2.5 font-semibold text-primary">
                              {e.event_name}
                            </td>
                            <td className="px-3.5 py-2.5 text-muted-foreground">
                              {e.feature || "-"}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">
                                {e.source}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right rtl:text-left text-muted-foreground">
                              {new Date(e.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Isolation Disclaimer */}
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 flex items-center gap-2.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>{t("adminPublicVisitorsDisclaimer")}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOG */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <History className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">
                  {t("adminAuditTitle")}
                </h2>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left rtl:text-right">
                    <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">{t("adminAuditTimeCol")}</th>
                        <th className="px-3.5 py-2.5">{t("adminAuditActorCol")}</th>
                        <th className="px-3.5 py-2.5">{t("adminAuditActionCol")}</th>
                        <th className="px-3.5 py-2.5">{t("adminAuditTargetCol")}</th>
                        <th className="px-3.5 py-2.5">{t("adminAuditResultCol")}</th>
                        <th className="px-3.5 py-2.5">{t("adminAuditSummaryCol")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {(operations?.audit || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            {t("adminNoAuditRecords")}
                          </td>
                        </tr>
                      ) : (
                        operations?.audit.map((a) => (
                          <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                              {new Date(a.created_at).toLocaleString()}
                            </td>
                            <td className="px-3.5 py-2.5 text-foreground">
                              {a.actor_user_id.slice(0, 8)}...
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-primary">{a.action}</td>
                            <td className="px-3.5 py-2.5 text-muted-foreground">
                              {a.target_type} ({a.target_id?.slice(0, 8) || "-"})
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  a.result === "success"
                                    ? "bg-emerald-500/20 text-emerald-600"
                                    : "bg-destructive/20 text-destructive"
                                }`}
                              >
                                {a.result}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-muted-foreground max-w-xs truncate">
                              {JSON.stringify(a.change_summary)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: NFC OPERATIONS */}
        {activeTab === "nfc" && (
          <div className="space-y-6">
            {/* Provision NFC Tag Form */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Tag className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  {t("adminNfcProvisionTitle")}
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <select
                  value={provisionCardId}
                  onChange={(e) => setProvisionCardId(e.target.value)}
                  className="h-10 w-full sm:w-80 rounded-xl border border-border bg-background px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  <option value="">-- Optional: Pre-assign to Digital Card --</option>
                  {operations?.cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} (/c/{c.slug})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleProvisionNfc}
                  disabled={provisioning}
                  className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {provisioning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>{t("adminNfcProvisionBtn")}</span>
                </button>
              </div>
            </div>

            {/* NFC Cards with Active Tags List */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h3 className="font-display text-sm font-bold text-foreground">
                Card NFC Tag Assignments
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Card</th>
                      <th className="px-4 py-2.5">Owner</th>
                      <th className="px-4 py-2.5">Active Token</th>
                      <th className="px-4 py-2.5 text-right rtl:text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {operations?.cards.map((card) => (
                      <tr key={card.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {card.full_name} (/c/{card.slug})
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {card.owner_name || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {maskNfcToken(card.active_nfc_token)}
                        </td>
                        <td className="px-4 py-3 text-right rtl:text-left">
                          {card.active_nfc_token && (
                            <button
                              type="button"
                              onClick={() =>
                                setNfcRevokeModal({
                                  token: card.active_nfc_token!,
                                  submitting: false,
                                })
                              }
                              className="rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              {t("adminNfcRevokeBtn")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* USER DETAIL MODAL / DRAWER */}
      {detailUserId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="userDetailTitle"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2
                  id="userDetailTitle"
                  className="font-display text-base font-bold text-foreground"
                >
                  {t("adminUserDetailTitle")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailUserId(null);
                  setUserDetail(null);
                }}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                <span className="text-xs text-muted-foreground mt-2 block">{t("pleaseWait")}</span>
              </div>
            ) : userDetail ? (
              <div className="space-y-5 text-xs">
                {/* Profile Data */}
                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <h3 className="font-display text-xs font-bold text-foreground">
                    {t("adminProfileSection")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Name:</span>
                      <span className="font-semibold text-foreground">
                        {userDetail.profile.full_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Email:</span>
                      <span className="font-mono text-foreground">{userDetail.profile.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Phone:</span>
                      <span className="text-foreground">{userDetail.profile.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Plan Tier:</span>
                      <span className="font-bold uppercase text-primary">
                        {userDetail.profile.plan_tier}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Connections:</span>
                      <span className="font-semibold text-foreground">
                        {userDetail.connections_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{t("adminTrialUsed")}:</span>
                      <span className="text-foreground">
                        {userDetail.profile.trial_used ? t("adminYes") : t("adminNo")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owned Cards */}
                <div className="space-y-2">
                  <h3 className="font-display text-xs font-bold text-foreground">
                    {t("adminOwnedCardsSection")} ({userDetail.cards.length})
                  </h3>
                  {userDetail.cards.length === 0 ? (
                    <p className="text-muted-foreground italic text-[11px]">
                      {t("adminNoCardsFound")}
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-[11px] text-left rtl:text-right">
                        <thead className="bg-muted/50 text-[10px] font-semibold uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-3 py-2">Slug</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Published</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {userDetail.cards.map((c) => (
                            <tr key={c.id}>
                              <td className="px-3 py-2 font-mono text-primary">/c/{c.slug}</td>
                              <td className="px-3 py-2 font-medium">{c.full_name}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                    c.is_active
                                      ? "bg-emerald-500/20 text-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {c.is_active ? "LIVE" : "INACTIVE"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {c.published_at ? (
                                  new Date(c.published_at).toLocaleDateString()
                                ) : (
                                  <span className="italic text-[10px] text-amber-500">
                                    {t("adminNotTrackedYet")}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Product Activity */}
                <div className="space-y-2">
                  <h3 className="font-display text-xs font-bold text-foreground">
                    {t("adminProductActivitySection")}
                  </h3>
                  {userDetail.product_activity.length === 0 ? (
                    <p className="text-muted-foreground italic text-[11px]">
                      {t("adminNoProductActivity")}
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border max-h-40 overflow-y-auto divide-y divide-border">
                      {userDetail.product_activity.map((pa, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 flex items-center justify-between text-[11px] font-mono"
                        >
                          <span className="font-semibold text-primary">{pa.event_name}</span>
                          <span className="text-muted-foreground">
                            {new Date(pa.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Audit Log */}
                <div className="space-y-2">
                  <h3 className="font-display text-xs font-bold text-foreground">
                    {t("adminUserAuditSection")}
                  </h3>
                  {userDetail.audit.length === 0 ? (
                    <p className="text-muted-foreground italic text-[11px]">
                      {t("adminNoUserAudit")}
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border max-h-40 overflow-y-auto divide-y divide-border font-mono text-[11px]">
                      {userDetail.audit.map((al) => (
                        <div key={al.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-primary">{al.action}</span>
                            <span className="text-muted-foreground ml-2 text-[10px]">
                              {JSON.stringify(al.change_summary)}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(al.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CHANGE ENTITLEMENT */}
      {entitlementModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">
              {t("adminConfirmEntitlementTitle")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("adminConfirmEntitlementDesc")}</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">New Plan Tier:</label>
                <select
                  value={entitlementModal.newTier}
                  onChange={(e) =>
                    setEntitlementModal((prev) =>
                      prev ? { ...prev, newTier: e.target.value } : null,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">
                  {t("adminReasonRequired")}:
                </label>
                <input
                  type="text"
                  value={entitlementModal.reason}
                  onChange={(e) =>
                    setEntitlementModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminReasonPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntitlementModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmEntitlement}
                disabled={entitlementModal.submitting}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {entitlementModal.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t("confirm")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: TOGGLE CARD ACTIVE */}
      {cardActiveModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">
              {t("adminConfirmCardStatusTitle")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("adminConfirmCardStatusDesc")} (/c/{cardActiveModal.card.slug})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">
                  {t("adminReasonRequired")}:
                </label>
                <input
                  type="text"
                  value={cardActiveModal.reason}
                  onChange={(e) =>
                    setCardActiveModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminReasonPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCardActiveModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmCardActive}
                disabled={cardActiveModal.submitting}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {cardActiveModal.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t("confirm")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE CARD */}
      {deleteCardModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-base font-bold">
                {t("adminConfirmDeleteCardTitle")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("adminConfirmDeleteCardDesc")}{" "}
              <span className="font-bold text-foreground">{deleteCardModal.card.slug}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <input
                  type="text"
                  value={deleteCardModal.confirmSlug}
                  onChange={(e) =>
                    setDeleteCardModal((prev) =>
                      prev ? { ...prev, confirmSlug: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminConfirmDeleteCardPlaceholder")}
                  className="h-10 w-full rounded-xl border border-destructive/40 bg-background px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-destructive/40"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">
                  {t("adminReasonRequired")}:
                </label>
                <input
                  type="text"
                  value={deleteCardModal.reason}
                  onChange={(e) =>
                    setDeleteCardModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminReasonPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCardModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCard}
                disabled={deleteCardModal.submitting}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleteCardModal.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t("delete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE PROFILE */}
      {deleteProfileModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-base font-bold">
                {t("adminConfirmDeleteProfileTitle")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("adminConfirmDeleteProfileDesc")}{" "}
              <span className="font-bold text-foreground">{deleteProfileModal.user.email}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <input
                  type="email"
                  value={deleteProfileModal.confirmEmail}
                  onChange={(e) =>
                    setDeleteProfileModal((prev) =>
                      prev ? { ...prev, confirmEmail: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminConfirmDeleteProfilePlaceholder")}
                  className="h-10 w-full rounded-xl border border-destructive/40 bg-background px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-destructive/40"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">
                  {t("adminReasonRequired")}:
                </label>
                <input
                  type="text"
                  value={deleteProfileModal.reason}
                  onChange={(e) =>
                    setDeleteProfileModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null,
                    )
                  }
                  placeholder={t("adminReasonPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProfileModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProfile}
                disabled={deleteProfileModal.submitting}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleteProfileModal.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t("delete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REVOKE NFC TAG */}
      {nfcRevokeModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-base font-bold">Revoke Physical NFC Tag</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("adminNfcRevokeWarning")} Token:{" "}
              <span className="font-mono font-bold text-foreground">
                {maskNfcToken(nfcRevokeModal.token)}
              </span>
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNfcRevokeModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeNfc}
                disabled={nfcRevokeModal.submitting}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {nfcRevokeModal.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{t("adminNfcRevokeBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
