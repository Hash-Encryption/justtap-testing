import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation, type Language } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  uploadAccountAvatar,
  type UserProfileData,
} from "@/lib/account";
import { getUserOrders, getOrderEvents, type CardOrder, type CardOrderEvent } from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Crown,
  Package,
  Shield,
  Settings,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

type TabType = "profile" | "plan" | "orders" | "security" | "preferences" | "danger";

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, lang, setLang, dir } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Security form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<CardOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderEvents, setOrderEvents] = useState<Record<string, CardOrderEvent[]>>({});

  // Danger zone state
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Load user profile
  useEffect(() => {
    if (!user) {
      if (!authLoading) {
        navigate({ to: "/auth" });
      }
      return;
    }

    async function loadData() {
      if (!user) return;
      setLoadingProfile(true);
      const { data } = await getUserProfile(user.id);
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || null);
      }
      setLoadingProfile(false);
    }

    loadData();
  }, [user, authLoading, navigate]);

  // Load orders when orders tab is activated
  useEffect(() => {
    if (activeTab === "orders" && user) {
      loadOrders();
    }
  }, [activeTab, user]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    const { data } = await getUserOrders();
    setOrders(data);
    setLoadingOrders(false);
  };

  const handleToggleOrderExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderEvents[orderId]) {
      const { data } = await getOrderEvents(orderId);
      setOrderEvents((prev) => ({ ...prev, [orderId]: data }));
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const { url, error } = await uploadAccountAvatar(user.id, file);
    if (error || !url) {
      toast.error(error || "Failed to upload avatar");
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(url);
    await updateUserProfile(user.id, { avatar_url: url });
    setUploadingAvatar(false);
    toast.success(t("profileUpdated"));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    const { error } = await updateUserProfile(user.id, {
      full_name: fullName,
      phone: phone,
      avatar_url: avatarUrl,
    });

    setSavingProfile(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(t("profileUpdated"));
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }

    setSavingPassword(true);
    const { error } = await updateUserPassword(newPassword);
    setSavingPassword(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success(t("passwordChanged"));
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      toast.error(lang === "ar" ? "يرجى كتابة DELETE للتأكيد" : "Please type DELETE to confirm");
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      toast.error("Authentication required");
      return;
    }

    setIsDeletingAccount(true);
    const { ok, error } = await deleteUserAccount(session.access_token, deleteConfirmation);
    setIsDeletingAccount(false);

    if (ok) {
      toast.success(t("accountDeletedSuccess"));
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } else {
      toast.error(error || "Failed to delete account");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  // Helper for initials fallback
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

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-[#08080A] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const isTrialActive =
    profile?.plan_tier === "trialing" &&
    profile?.trial_ends_at &&
    new Date(profile.trial_ends_at) > new Date();

  const trialDaysRemaining =
    isTrialActive && profile?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  return (
    <div dir={dir} className="min-h-screen bg-[#08080A] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#0D0D11]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
            >
              {dir === "rtl" ? (
                <ArrowRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5" />
              )}
              <span>{lang === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}</span>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <Link to="/dashboard" className="font-bold tracking-tight text-base text-white">
              Just<span className="text-purple-400">Tap</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Account Header Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#121218] to-[#0D0D12] border border-white/[0.08] flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Account Avatar with Upload Trigger */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-600/30 to-purple-950/40 border-2 border-purple-500/40 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-xl shadow-purple-950/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Account avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials(fullName, user?.email)}</span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] gap-1"
            >
              <Camera className="w-4 h-4" />
              <span>{uploadingAvatar ? t("saving") : t("changeAvatar")}</span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={uploadingAvatar}
            />
          </div>

          {/* Identity & Status */}
          <div className="flex-1 text-center sm:text-start space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {fullName || user?.email?.split("@")[0] || "JustTap User"}
              </h1>
              {/* Plan Tier Badge */}
              <div className="self-center sm:self-auto">
                {isTrialActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>
                      PRO TRIAL • {trialDaysRemaining} {lang === "ar" ? "أيام متبقية" : "days left"}
                    </span>
                  </span>
                ) : profile?.plan_tier === "pro" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Crown className="w-3 h-3" />
                    <span>PRO PLAN</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-zinc-300 border border-white/10">
                    FREE PLAN (1 Card)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono">{user?.email}</p>
            <p className="text-xs text-zinc-500 max-w-xl">{t("accountCenterDesc")}</p>
          </div>
        </div>

        {/* Account Center Layout: Tabs + Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar / Horizontal Pills on Mobile */}
          <div className="md:col-span-1 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "profile"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>{t("tabProfile")}</span>
            </button>

            <button
              onClick={() => setActiveTab("plan")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "plan"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              <span>{t("tabPlan")}</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "orders"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>{t("tabOrders")}</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "security"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>{t("tabSecurity")}</span>
            </button>

            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "preferences"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>{t("tabPreferences")}</span>
            </button>

            <button
              onClick={() => setActiveTab("danger")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 md:w-full text-start ${
                activeTab === "danger"
                  ? "bg-red-950/40 text-red-400 border border-red-500/30"
                  : "text-red-400/70 hover:text-red-300 hover:bg-red-950/20"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t("tabDanger")}</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="md:col-span-3">
            {/* 1. Profile Tab */}
            {activeTab === "profile" && (
              <div className="p-6 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">{t("tabProfile")}</h3>
                  <p className="text-xs text-zinc-400">{t("accountAvatarHint")}</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">{t("accountFullName")}</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Hashim Alnimari"
                      className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">{t("accountPhone")}</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 50 123 4567"
                      className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">{t("accountEmail")}</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="bg-zinc-900/50 border-white/5 text-zinc-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-zinc-500">{t("accountEmailNotice")}</p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-5"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>{t("saving")}</span>
                        </>
                      ) : (
                        t("saveChanges")
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. Plan & Upgrade Tab */}
            {activeTab === "plan" && (
              <div className="p-6 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">{t("tabPlan")}</h3>
                  <p className="text-xs text-zinc-400">
                    {lang === "ar"
                      ? "إدارة باقة الاشتراك، حدود البطاقات الرقمية وخيارات الترقية"
                      : "Manage your subscription tier, digital card limits, and upgrade options"}
                  </p>
                </div>

                {/* Current Plan Status Box */}
                <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                      {lang === "ar" ? "الباقة الحالية" : "Current Plan"}
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {isTrialActive ? "PRO TRIAL" : (profile?.plan_tier || "free").toUpperCase()}
                    </span>
                  </div>

                  {isTrialActive && (
                    <div className="text-xs text-purple-200">
                      {t("trialActiveBanner").replace("{days}", String(trialDaysRemaining))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[10px] text-zinc-400">
                        {lang === "ar" ? "حد البطاقات المجانية" : "Free Tier"}
                      </div>
                      <div className="text-sm font-bold text-white">1 Card</div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/30 text-center">
                      <div className="text-[10px] text-purple-300">
                        {lang === "ar" ? "باقة Pro" : "Pro Tier"}
                      </div>
                      <div className="text-sm font-bold text-purple-200">3 Cards</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[10px] text-zinc-400">
                        {lang === "ar" ? "باقة التجربة" : "Trial Tier"}
                      </div>
                      <div className="text-sm font-bold text-white">3 Cards</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[10px] text-zinc-400">
                        {lang === "ar" ? "باقة Enterprise" : "Enterprise"}
                      </div>
                      <div className="text-sm font-bold text-white">5 Cards</div>
                    </div>
                  </div>
                </div>

                {/* Non-Destructive Downgrade Explanation */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-2">
                  <div className="font-semibold text-zinc-200">
                    {lang === "ar"
                      ? "حفظ البطاقات عند انتهاء التجربة"
                      : "Non-Destructive Trial Preservation"}
                  </div>
                  <p className="leading-relaxed text-zinc-400">
                    {lang === "ar"
                      ? "عند انتهاء فترة التجربة، تظل بطاقتك الرئيسية نشطة ومتاحة مجاناً. البطاقات الإضافية تظل محفوظة بأمان في حسابك دون أي حذف، وسيتم إعادة تفعيلها فوراً بمجرد الترقية إلى باقة Pro."
                      : "When your trial ends, your designated Primary Card remains active on the Free tier. Any additional cards remain securely stored without data loss, and will automatically reactivate upon upgrading to Pro."}
                  </p>
                </div>

                <div className="pt-2">
                  <Link to="/dashboard">
                    <Button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      <span>{lang === "ar" ? "استعراض ميزات Pro" : "Explore Pro Features"}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* 3. Orders Tab */}
            {activeTab === "orders" && (
              <div className="p-6 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{t("tabOrders")}</h3>
                    <p className="text-xs text-zinc-400">
                      {lang === "ar"
                        ? "سجل بطاقات NFC الفيزيائية ومتابعة حالة التجهيز والشحن"
                        : "Track physical NFC card purchases, manufacturing, and delivery status"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOrders}
                    disabled={loadingOrders}
                    className="text-xs border-white/10 text-zinc-300 hover:text-white"
                  >
                    {loadingOrders ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : lang === "ar" ? (
                      "تحديث"
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>

                {loadingOrders ? (
                  <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>{t("pleaseWait")}</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-10 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                    <Package className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-400">{t("noOrdersYet")}</p>
                    <Link to="/dashboard">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                      >
                        {t("orderPhysicalCard")}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => {
                      const isExpanded = expandedOrderId === o.id;
                      const events = orderEvents[o.id] || [];

                      return (
                        <div
                          key={o.id}
                          className="rounded-xl bg-[#14141A] border border-white/[0.08] overflow-hidden transition-all"
                        >
                          {/* Order Header Summary */}
                          <div
                            onClick={() => handleToggleOrderExpand(o.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02]"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-sm font-bold text-purple-400">
                                  {o.order_number}
                                </span>
                                <span className="text-xs font-medium text-zinc-300">
                                  {o.card_name_snapshot}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500">
                                {new Date(o.created_at).toLocaleDateString(
                                  lang === "ar" ? "ar-EG" : "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Fulfillment status badge */}
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  o.fulfillment_status === "completed"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : o.fulfillment_status === "shipped"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {o.fulfillment_status === "new" && t("fulfillmentNew")}
                                {o.fulfillment_status === "preparing" && t("fulfillmentPreparing")}
                                {o.fulfillment_status === "ready" && t("fulfillmentReady")}
                                {o.fulfillment_status === "shipped" && t("fulfillmentShipped")}
                                {o.fulfillment_status === "completed" && t("fulfillmentCompleted")}
                                {o.fulfillment_status === "cancelled" && t("fulfillmentCancelled")}
                              </span>

                              <span className="font-mono text-sm font-bold text-white">
                                {o.total.toFixed(2)} {o.currency}
                              </span>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Order Details & Timeline */}
                          {isExpanded && (
                            <div className="border-t border-white/[0.08] p-5 bg-black/20 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1.5">
                                  <div className="text-zinc-500 font-medium">
                                    {t("shippingDetails")}
                                  </div>
                                  <div className="text-white font-medium">
                                    {o.recipient_name} ({o.recipient_phone})
                                  </div>
                                  <div className="text-zinc-400">
                                    {o.shipping_address}, {o.city}
                                  </div>
                                  {o.delivery_instructions && (
                                    <div className="text-zinc-500 italic">
                                      “{o.delivery_instructions}”
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-zinc-500 font-medium">
                                    {t("physicalCardDetails")}
                                  </div>
                                  <div className="text-white font-mono">
                                    {o.product_name} • {o.product_variant}
                                  </div>
                                  <div className="text-zinc-500 font-mono">SKU: {o.sku}</div>
                                  {o.nfc_token_snapshot && (
                                    <div className="text-purple-400 font-mono text-[11px]">
                                      NFC Tag: {o.nfc_token_snapshot.slice(0, 12)}…
                                    </div>
                                  )}
                                  {o.tracking_number && (
                                    <div className="text-blue-400 font-mono text-[11px]">
                                      {o.carrier || "Carrier"}: {o.tracking_number}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Order Events Timeline */}
                              <div className="pt-2 border-t border-white/[0.05] space-y-2">
                                <h5 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                  {t("orderTimeline")}
                                </h5>
                                {events.length === 0 ? (
                                  <p className="text-[11px] text-zinc-600">
                                    No events recorded yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {events.map((ev) => (
                                      <div
                                        key={ev.id}
                                        className="flex items-start gap-2.5 text-xs text-zinc-300"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <div className="flex-1 flex justify-between">
                                          <span className="capitalize font-medium">
                                            {ev.event_type.replace("_", " ")}
                                          </span>
                                          <span className="text-[10px] text-zinc-500 font-mono">
                                            {new Date(ev.created_at).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Security Tab */}
            {activeTab === "security" && (
              <div className="p-6 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">{t("tabSecurity")}</h3>
                  <p className="text-xs text-zinc-400">
                    {lang === "ar"
                      ? "تحديث كلمة المرور وحماية حسابك"
                      : "Update your password and protect your account"}
                  </p>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">{t("newPasswordLabel")}</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">{t("confirmPasswordLabel")}</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingPassword}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-5"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>{t("saving")}</span>
                        </>
                      ) : (
                        t("updatePasswordBtn")
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="p-6 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">{t("tabPreferences")}</h3>
                  <p className="text-xs text-zinc-400">
                    {lang === "ar"
                      ? "تخصيص لغة الواجهة وتفضيلات العرض"
                      : "Customize interface language and display preferences"}
                  </p>
                </div>

                <div className="space-y-3 max-w-lg">
                  <Label className="text-xs text-zinc-300">
                    {lang === "ar" ? "لغة التطبيق" : "App Language"}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLang("en")}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        lang === "en"
                          ? "bg-purple-600/20 border-purple-500/40 text-white font-bold"
                          : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      English (LTR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang("ar")}
                      className={`p-3 rounded-xl border text-center transition-all font-arabic ${
                        lang === "ar"
                          ? "bg-purple-600/20 border-purple-500/40 text-white font-bold"
                          : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      العربية (RTL)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{t("deleteAccountTitle")}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {t("deleteAccountWarning")}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                  {t("deleteAccountNfcWarning")}
                </div>

                <div className="space-y-3 max-w-lg pt-2">
                  <Label className="text-xs text-zinc-300">{t("typeDeleteToConfirm")}</Label>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    className="bg-black/60 border-red-500/30 text-white placeholder:text-zinc-700 font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={
                      isDeletingAccount || deleteConfirmation.trim().toUpperCase() !== "DELETE"
                    }
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t("deleting")}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("deleteMyAccount")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
