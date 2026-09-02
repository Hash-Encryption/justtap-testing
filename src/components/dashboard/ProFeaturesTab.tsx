import { useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileText,
  Lock,
  Mail,
  MousePointerClick,
  Play,
  Send,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { defaultProFeatures, getEmbedVideoUrl, type Card, type ProFeatures } from "@/lib/card";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitization";
import { isProEntitled } from "@/lib/card-design";
import { useTranslation } from "@/lib/i18n";
import { ProUpgradeDialog, type ProUpgradeSource } from "./ProUpgradeDialog";
import {
  trackProFeatureView,
  trackProPreviewConfigured,
  trackProPreviewStarted,
} from "@/lib/product-events";
import type { Session } from "@supabase/supabase-js";

type Props = {
  card: Card;
  onChange: (updated: Card) => void;
  userId: string;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
};

export function ProFeaturesTab({ card, onChange, userId, session, onTrialStarted }: Props) {
  const { t } = useTranslation();
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState<ProUpgradeSource>("pro_features");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPro = isProEntitled(card);
  const pro: ProFeatures = {
    ...defaultProFeatures,
    ...(typeof card?.pro_features === "object" && card?.pro_features !== null
      ? card.pro_features
      : {}),
  };

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    Boolean(pro.enable_lead_webhook || pro.webhook_url),
  );

  useEffect(() => {
    void trackProFeatureView("pro_features");
    if (!isPro) {
      void trackProPreviewStarted("pro_features");
    }
  }, [isPro]);

  const updatePro = <K extends keyof ProFeatures>(key: K, value: ProFeatures[K]) => {
    void trackProPreviewConfigured(String(key));
    const updatedPro = {
      ...defaultProFeatures,
      ...(typeof card?.pro_features === "object" && card?.pro_features !== null
        ? card.pro_features
        : {}),
      [key]: value,
    };
    onChange({ ...card, pro_features: updatedPro });
  };

  async function saveProFeatures() {
    if (!card.id) {
      toast.error(t("publishCardFirstToast"));
      return;
    }

    if (!isPro) {
      setUpgradeSource("pro_features_save");
      setUpgradeOpen(true);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("cards")
      .update({
        pro_features: card.pro_features || defaultProFeatures,
      })
      .eq("id", card.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("[pro-features] Save failed", { code: error.code, message: error.message });
      toast.error(t("proFeaturesSaveFailedToast"));
      return;
    }

    if (data) {
      onChange(data as Card);
      toast.success(t("proFeaturesSavedToast"));
    }
  }

  async function sendTestEmailAlert() {
    const emailToUse = pro.notify_email || card.email;
    if (!emailToUse) {
      toast.error(t("testEmailEnterEmailFirst"));
      return;
    }

    if (!isPro) {
      setUpgradeSource("pro_features_action");
      setUpgradeOpen(true);
      toast.info(t("testEmailProRequired"));
      return;
    }

    setTestingEmail(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/lead-email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          card_id: card.id,
          sender_name: "Sarah Smith (Test Lead)",
          sender_phone: "+1 555-0199",
          note: "Hi! Great meeting you at the conference. Let's schedule a consultation.",
          is_test: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${t("testEmailSentSuccess")} ${data.recipient || emailToUse}!`);
      } else {
        toast.error(data.error || t("testEmailFailed"));
      }
    } catch {
      toast.error(t("testEmailFailed"));
    } finally {
      setTestingEmail(false);
    }
  }

  async function sendTestWebhook() {
    if (!pro.webhook_url) {
      toast.error(t("webhookEnterUrlFirst"));
      return;
    }

    if (!isPro) {
      setUpgradeSource("pro_features_action");
      setUpgradeOpen(true);
      toast.info(t("webhookProRequired"));
      return;
    }

    setTestingWebhook(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/lead-webhook", {
        method: "POST",
        headers,
        body: JSON.stringify({
          card_id: card.id,
          sender_name: "Test Visitor (Zapier Test)",
          sender_phone: "+1 555-0199",
          note: "This is a test lead payload sent from JustTap Pro Features tab.",
          is_test: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.webhook_status === "delivered"
            ? t("webhookTestSuccess")
            : t("webhookTestConfigured"),
        );
      } else {
        toast.error(data.error || t("webhookTestFailed"));
      }
    } catch {
      toast.error(t("webhookTestFailed"));
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error(t("pdfValidPdfToast"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("pdfSizeLimitToast"));
      return;
    }

    if (!isPro) {
      const objectUrl = URL.createObjectURL(file);
      updatePro("pdf_url", objectUrl);
      toast.info(t("pdfPreviewLoadedToast"));
      return;
    }

    setUploadingPdf(true);
    try {
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const path = `${userId || "guest"}/docs/pdf_${fileId}.pdf`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: true });

      if (error) {
        toast.error(t("pdfUploadFailedToast"));
      } else {
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        updatePro("pdf_url", data.publicUrl);
        toast.success(t("pdfUploadedSuccessToast"));
      }
    } catch {
      toast.error(t("pdfUploadFailedToast"));
    } finally {
      setUploadingPdf(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER BANNER */}
      <div
        data-testid="pro-features-header"
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isPro
                  ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                  : "border border-primary/30 bg-primary/20 text-primary"
              }`}
            >
              {isPro ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isPro ? t("proActiveBadge") : t("proPreviewBadge")}</span>
            </div>
            <h2 className="mt-2 font-display text-xl md:text-2xl font-bold text-foreground">
              {t("proBlocksTitle")}
            </h2>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {t("proBlocksDesc")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isPro && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t("proStatusActive")}</span>
              </span>
            )}

            {!isPro && (
              <button
                type="button"
                onClick={() => {
                  setUpgradeSource("pro_features");
                  setUpgradeOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-90 active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("start7DayTrialBtn")}</span>
              </button>
            )}
          </div>
        </div>

        {!isPro && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-400/90 leading-relaxed">
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{t("freePlanNotice")}</span>
          </div>
        )}

        {isPro && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400/90 leading-relaxed">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{t("proActiveDesc")}</span>
          </div>
        )}
      </div>

      {/* FEATURE 1: VIDEO INTRODUCTION */}
      <div
        data-testid="pro-feature-video"
        className="glass relative rounded-2xl border border-border/60 p-5 md:p-6 transition-all duration-200 hover:border-border/80"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("videoIntroTitle")}
                </h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                    {t("proMarker")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("videoIntroDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-2">
            <label htmlFor="pro-video-url" className="sr-only">
              {t("videoIntroTitle")}
            </label>
            <input
              id="pro-video-url"
              type="url"
              value={pro.video_url || ""}
              onChange={(e) =>
                updatePro("video_url", sanitizeUrl(e.target.value) || e.target.value)
              }
              placeholder={t("videoIntroPlaceholder")}
              className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">{t("videoIntroSupportHint")}</p>

            {pro.video_url && (
              <div className="pt-1">
                {getEmbedVideoUrl(pro.video_url) ? (
                  <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("videoValidLink")}</span>
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-amber-400">
                    {t("videoUnsupportedFormat")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mini UI Preview */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 flex items-center justify-between">
              <span>{t("previewCard")}</span>
              <span className="text-[9px] font-normal text-muted-foreground/60">
                {pro.video_url && getEmbedVideoUrl(pro.video_url)
                  ? t("livePreviewBadge")
                  : t("exampleBadge")}
              </span>
            </div>
            {pro.video_url && getEmbedVideoUrl(pro.video_url) ? (
              <div className="overflow-hidden rounded-2xl border border-border aspect-video w-full shadow-md bg-black/40">
                <iframe
                  src={getEmbedVideoUrl(pro.video_url)!}
                  title={t("videoIntroTitle")}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 p-4 text-center aspect-video w-full relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary border border-primary/30 shadow-inner mb-2">
                  <Play className="h-4 w-4 fill-primary text-primary ml-0.5 rtl:ml-0 rtl:mr-0.5" />
                </div>
                <p className="text-xs font-semibold text-foreground/90">
                  {t("videoPreviewExampleTitle")}
                </p>
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t("videoPreviewExampleBadge")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FEATURE 2: SHARE A PDF OR BROCHURE */}
      <div
        data-testid="pro-feature-pdf"
        className="glass relative rounded-2xl border border-border/60 p-5 md:p-6 transition-all duration-200 hover:border-border/80"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("pdfDocTitle")}
                </h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                    {t("proMarker")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("pdfDocDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-3.5">
            <div>
              <label
                htmlFor="pro-pdf-label"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t("pdfBtnLabel")}
              </label>
              <input
                id="pro-pdf-label"
                type="text"
                value={pro.pdf_label || ""}
                onChange={(e) => updatePro("pdf_label", sanitizeText(e.target.value, 60))}
                placeholder={t("pdfBtnPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="pro-pdf-url"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t("pdfUploadLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  id="pro-pdf-url"
                  type="url"
                  value={pro.pdf_url || ""}
                  onChange={(e) =>
                    updatePro("pdf_url", sanitizeUrl(e.target.value) || e.target.value)
                  }
                  placeholder={t("pdfUploadPlaceholder")}
                  className="h-11 flex-1 min-w-0 rounded-xl border border-border bg-transparent px-3.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <label className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3.5 text-xs font-medium hover:bg-secondary transition active:scale-[0.98]">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingPdf ? t("uploading") : t("uploadBtn")}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Mini UI Preview */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 flex items-center justify-between">
              <span>{t("previewCard")}</span>
              <span className="text-[9px] font-normal text-muted-foreground/60">
                {t("exampleBadge")}
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-border/70 bg-secondary/30 p-4 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground/90">
                      {pro.pdf_label?.trim() || t("pdfDefaultLabel")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("pdfDocumentBadge")}</p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {t("pdfOpenAction")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 3: LET PEOPLE BOOK YOU */}
      <div
        data-testid="pro-feature-booking"
        className="glass relative rounded-2xl border border-border/60 p-5 md:p-6 transition-all duration-200 hover:border-border/80"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("bookingTitle")}
                </h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                    {t("proMarker")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("bookingDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-2">
            <label
              htmlFor="pro-booking-url"
              className="block text-xs font-medium text-muted-foreground"
            >
              {t("bookingPlaceholder")}
            </label>
            <input
              id="pro-booking-url"
              type="url"
              value={pro.booking_url || ""}
              onChange={(e) =>
                updatePro("booking_url", sanitizeUrl(e.target.value) || e.target.value)
              }
              placeholder={t("bookingPlaceholder")}
              className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">{t("bookingHelperHint")}</p>
          </div>

          {/* Mini UI Preview */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 flex items-center justify-between">
              <span>{t("previewCard")}</span>
              <span className="text-[9px] font-normal text-muted-foreground/60">
                {t("exampleBadge")}
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-border/70 bg-secondary/30 p-4 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground/90">
                      {t("bookingActionLabel")}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {pro.booking_url?.trim() ? pro.booking_url : t("bookingLinkExample")}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                  {t("bookingChooseTime")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 4: ADD A MAIN ACTION */}
      <div
        data-testid="pro-feature-cta"
        className="glass relative rounded-2xl border border-border/60 p-5 md:p-6 transition-all duration-200 hover:border-border/80"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("customCtaTitle")}
                </h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                    {t("proMarker")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("customCtaDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-3.5">
            <div>
              <label
                htmlFor="pro-cta-label"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t("customCtaButtonTitle")}
              </label>
              <input
                id="pro-cta-label"
                type="text"
                value={pro.custom_cta_label || ""}
                onChange={(e) => updatePro("custom_cta_label", sanitizeText(e.target.value, 40))}
                placeholder={t("customCtaButtonPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="pro-cta-url"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t("customCtaDestinationLabel")}
              </label>
              <input
                id="pro-cta-url"
                type="url"
                value={pro.custom_cta_url || ""}
                onChange={(e) =>
                  updatePro("custom_cta_url", sanitizeUrl(e.target.value) || e.target.value)
                }
                placeholder={t("customCtaDestinationPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Mini UI Preview */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 flex items-center justify-between">
              <span>{t("previewCard")}</span>
              <span className="text-[9px] font-normal text-muted-foreground/60">
                {t("actionButtonBadge")}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 p-4 w-full">
              <div className="w-full flex items-center justify-center">
                <div className="inline-flex w-full max-w-[240px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20">
                  <span className="truncate">
                    {pro.custom_cta_label?.trim() || t("customCtaDefaultLabel")}
                  </span>
                  <span className="text-xs rtl:rotate-180">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 5: NEW CONNECTION ALERTS */}
      <div
        data-testid="pro-feature-alerts"
        className="glass relative rounded-2xl border border-primary/40 bg-primary/5 p-5 md:p-6 transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("emailAlertsTitle")}
                </h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                    {t("proMarker")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("emailAlertsDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="email-alerts-toggle" className="text-xs font-medium cursor-pointer">
              {t("emailAlertsToggle")}
            </label>
            <input
              id="email-alerts-toggle"
              type="checkbox"
              checked={pro.enable_email_alerts !== false}
              onChange={(e) => updatePro("enable_email_alerts", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        {pro.enable_email_alerts !== false && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-4 border-t border-border/40">
            {/* Controls */}
            <div className="md:col-span-7 space-y-2">
              <label
                htmlFor="pro-notify-email"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t("emailAlertsDestLabel")}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="pro-notify-email"
                  type="email"
                  value={pro.notify_email || card.email || ""}
                  onChange={(e) => updatePro("notify_email", sanitizeText(e.target.value, 100))}
                  placeholder={t("emailAlertsDestPlaceholder")}
                  className="h-11 flex-1 min-w-0 rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={sendTestEmailAlert}
                  disabled={testingEmail}
                  className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 rtl:rotate-180" />
                  <span>{testingEmail ? t("sendingTestEmail") : t("sendTestEmailBtn")}</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">{t("leadsInboxHint")}</p>
            </div>

            {/* Mini UI Preview */}
            <div className="md:col-span-5 flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 flex items-center justify-between">
                <span>{t("previewCard")}</span>
                <span className="text-[9px] font-normal text-muted-foreground/60">
                  {t("connectionAlertMockBadge")}
                </span>
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-border/70 bg-secondary/30 p-4 w-full relative">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground/90">
                        {t("connectionAlertMockTitle")}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {t("connectionAlertMockTime")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {t("connectionAlertMockBody")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE 6: ADVANCED INTEGRATIONS / WEBHOOK */}
      <div
        data-testid="pro-feature-webhook"
        className="glass relative rounded-2xl border border-border/60 overflow-hidden transition-all duration-200 hover:border-border/80"
      >
        <button
          type="button"
          aria-expanded={isAdvancedOpen}
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-5 md:p-6 text-left rtl:text-right hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground border border-border">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm md:text-base text-foreground">
                  {t("advancedIntegrationsTitle")}
                </h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t("webhookOptional")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {t("advancedIntegrationsDesc")}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isAdvancedOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isAdvancedOpen && (
          <div className="p-5 md:p-6 pt-0 space-y-4 border-t border-border/40 mt-1">
            <div className="flex items-center justify-between pt-3">
              <label
                htmlFor="enable-webhook-checkbox"
                className="text-xs font-medium cursor-pointer text-foreground"
              >
                {t("enableWebhookToggle")}
              </label>
              <input
                id="enable-webhook-checkbox"
                type="checkbox"
                checked={pro.enable_lead_webhook ?? false}
                onChange={(e) => updatePro("enable_lead_webhook", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {pro.enable_lead_webhook && (
              <div className="space-y-2">
                <label
                  htmlFor="pro-webhook-url"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  {t("webhookUrlLabel")}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="pro-webhook-url"
                    type="url"
                    value={pro.webhook_url || ""}
                    onChange={(e) =>
                      updatePro("webhook_url", sanitizeUrl(e.target.value) || e.target.value)
                    }
                    placeholder={t("webhookUrlPlaceholder")}
                    className="h-11 flex-1 min-w-0 rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={sendTestWebhook}
                    disabled={testingWebhook}
                    className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-xs font-medium hover:bg-secondary transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 rtl:rotate-180" />
                    <span>{testingWebhook ? t("testingWebhook") : t("testWebhookBtn")}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("webhookHelperHint")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FEATURE 7: USE YOUR OWN BRAND */}
      <div
        data-testid="pro-feature-brand"
        className="glass rounded-2xl border border-border/60 p-5 md:p-6 transition-all duration-200 hover:border-border/80"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-7 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm md:text-base text-foreground">
                    {t("removeBrandingTitle")}
                  </h3>
                  {!isPro && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                      {t("proMarker")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t("removeBrandingDesc")}
                </p>
              </div>
            </div>
            <input
              id="remove-branding-checkbox"
              aria-label={t("removeBrandingTitle")}
              type="checkbox"
              checked={pro.remove_branding ?? false}
              onChange={(e) => updatePro("remove_branding", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0 mt-1"
            />
          </div>

          <div className="md:col-span-5">
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-2.5">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  {t("brandBeforeLabel")}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t("brandBeforeVal")}
                </span>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-2.5">
                <span className="text-[10px] uppercase font-semibold text-primary block mb-1">
                  {t("brandAfterLabel")}
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {t("brandAfterVal")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE BUTTON BAR */}
      <div
        data-testid="pro-features-save-bar"
        className="sticky bottom-6 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-muted-foreground">
            {isPro ? t("proFeaturesActiveOnAccount") : t("customizeSpecialFeatures")}
          </span>
        </div>
        {isPro ? (
          <button
            type="button"
            onClick={() => void saveProFeatures()}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveProFeaturesBtn")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setUpgradeSource("pro_features_save");
              setUpgradeOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("upgradeToActivateBtn")}</span>
          </button>
        )}
      </div>

      {/* SHARED PRO UPGRADE DIALOG */}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        source={upgradeSource}
        draft={card}
        session={session}
        onTrialStarted={(trialEndsAt) => {
          onTrialStarted?.(trialEndsAt);
          setUpgradeOpen(false);
        }}
      />
    </div>
  );
}
