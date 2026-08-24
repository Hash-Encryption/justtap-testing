import { useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  MousePointerClick,
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

type Props = {
  card: Card;
  onChange: (updated: Card) => void;
  userId: string;
};

export function ProFeaturesTab({ card, onChange, userId }: Props) {
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

  const updatePro = <K extends keyof ProFeatures>(key: K, value: ProFeatures[K]) => {
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
      toast.error("Please publish your card first before saving special features.");
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
      toast.error("Failed to save special features. Please try again.");
      return;
    }

    if (data) {
      onChange(data as Card);
      toast.success("✨ Special features saved & published live to your digital card!");
    }
  }

  async function sendTestEmailAlert() {
    const emailToUse = pro.notify_email || card.email;
    if (!emailToUse) {
      toast.error("Please enter a Notification Email address first.");
      return;
    }

    if (!isPro) {
      setUpgradeSource("pro_features_action");
      setUpgradeOpen(true);
      toast.info(
        "Instant email lead alerts require JustTap Pro. Upgrade to enable live email delivery.",
      );
      return;
    }

    setTestingEmail(true);
    try {
      const res = await fetch("/api/lead-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        toast.success(`Test lead email dispatched to ${data.recipient || emailToUse}!`);
      } else {
        toast.error(data.error || "Failed to send test email");
      }
    } catch {
      toast.error("Failed to send test lead email notification.");
    } finally {
      setTestingEmail(false);
    }
  }

  async function sendTestWebhook() {
    if (!pro.webhook_url && !pro.notify_email) {
      toast.error("Please enter a Webhook URL or Notification Email first.");
      return;
    }

    if (!isPro) {
      setUpgradeSource("pro_features_action");
      setUpgradeOpen(true);
      toast.info(
        "Webhook lead forwarding requires JustTap Pro. Upgrade to enable live webhook dispatch.",
      );
      return;
    }

    setTestingWebhook(true);
    try {
      const res = await fetch("/api/lead-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          `Test payload dispatched! Status: ${data.webhook_status === "delivered" ? "Delivered to Webhook ✓" : "Configured"}`,
        );
      } else {
        toast.error(`Webhook test error: ${data.error || "Failed to deliver"}`);
      }
    } catch {
      toast.error("Failed to trigger test webhook.");
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF file size must be less than 10MB");
      return;
    }

    if (!isPro) {
      const objectUrl = URL.createObjectURL(file);
      updatePro("pdf_url", objectUrl);
      toast.info(
        "📄 PDF document preview loaded for simulator. Upgrade to Pro to host and publish documents.",
      );
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
        toast.error(`Upload failed: ${error.message}`);
      } else {
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        updatePro("pdf_url", data.publicUrl);
        toast.success("PDF document uploaded successfully!");
      }
    } catch (err) {
      toast.error("Failed to upload PDF document");
    } finally {
      setUploadingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Special Features & Pro Blocks
            </div>
            <h2 className="mt-2 font-display text-xl font-bold">
              Elevate Your Profile with Interactive Blocks
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Add video intros, PDF menus/brochures, live Calendly booking, custom CTAs & Apple
              Wallet passes.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isPro && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400">
                Pro Status: Active
              </span>
            )}

            {!isPro && (
              <button
                type="button"
                onClick={() => {
                  setUpgradeSource("pro_features");
                  setUpgradeOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" /> Start 7-Day Free Trial
              </button>
            )}
          </div>
        </div>

        {!isPro && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-500">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              You are currently on the <strong>Free Plan</strong>. You can customize these special
              features below and preview them in the live simulator, but start a free 7-day trial to
              make them live for public visitors.
            </span>
          </div>
        )}
      </div>

      {/* FEATURE 1: VIDEO INTRO EMBED */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-[#E6D5AC]">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Video Intro Embed</h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Embed a YouTube, Loom, or Vimeo video directly onto your digital card.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="url"
            value={pro.video_url || ""}
            onChange={(e) => updatePro("video_url", sanitizeUrl(e.target.value) || e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or YouTube Shorts / Loom / Vimeo link"
            className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
          />
          <p className="text-[11px] text-muted-foreground">
            Supports YouTube Shorts, YouTube Watch, Loom, Vimeo, and Google Drive video URLs.
          </p>

          {pro.video_url && (
            <div className="mt-2 space-y-2">
              {getEmbedVideoUrl(pro.video_url) ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-emerald-400">
                    ✓ Valid Video Link Detected — Live Preview Below:
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-border aspect-video w-full max-w-md shadow-md">
                    <iframe
                      src={getEmbedVideoUrl(pro.video_url)!}
                      title="Video Intro Preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] font-medium text-amber-400">
                  ⚠️ Unsupported video URL format. Please paste a valid YouTube, Loom, Vimeo, or
                  Google Drive link.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FEATURE 2: DOCUMENT & PDF ATTACHMENT */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-[#E6D5AC]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">PDF & Document Attachment</h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Attach a downloadable food menu, company brochure, catalog, or CV.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Button Display Label
            </label>
            <input
              type="text"
              value={pro.pdf_label || ""}
              onChange={(e) => updatePro("pdf_label", sanitizeText(e.target.value, 60))}
              placeholder="e.g. Download Product Catalog (PDF)"
              className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Upload PDF or Paste PDF URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={pro.pdf_url || ""}
                onChange={(e) =>
                  updatePro("pdf_url", sanitizeUrl(e.target.value) || e.target.value)
                }
                placeholder="https://.../brochure.pdf"
                className="h-11 flex-1 rounded-xl border border-border bg-transparent px-3 text-xs outline-none focus:border-primary"
              />
              <label className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium hover:bg-secondary">
                <Upload className="h-3.5 w-3.5" />
                {uploadingPdf ? "…" : "Upload"}
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
      </div>

      {/* FEATURE 3: CALENDLY & APPOINTMENT BOOKING */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-[#E6D5AC]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Live Appointment Booking</h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Link your Calendly, SavvyCal, or TidyCal URL so visitors can book meetings
                instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="url"
            value={pro.booking_url || ""}
            onChange={(e) =>
              updatePro("booking_url", sanitizeUrl(e.target.value) || e.target.value)
            }
            placeholder="https://calendly.com/your-name/30min"
            className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* FEATURE 4: CUSTOM CTA ACTION BUTTON */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-[#E6D5AC]">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Custom Call-To-Action (CTA) Button</h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Add a high-priority action button (e.g. &quot;Pay via Stripe&quot;, &quot;View
                Portfolio&quot;, &quot;Get Directions&quot;).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Button Title
            </label>
            <input
              type="text"
              value={pro.custom_cta_label || ""}
              onChange={(e) => updatePro("custom_cta_label", sanitizeText(e.target.value, 40))}
              placeholder="e.g. Book Consultation"
              className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Destination Link
            </label>
            <input
              type="url"
              value={pro.custom_cta_url || ""}
              onChange={(e) =>
                updatePro("custom_cta_url", sanitizeUrl(e.target.value) || e.target.value)
              }
              placeholder="https://..."
              className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* FEATURE 5: INSTANT EMAIL LEAD ALERTS (PRIMARY FEATURE) */}
      <div className="glass relative rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Instant Email Lead Alerts (Main Feature)</h3>
                {!isPro && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Receive an automatic email notification the moment a visitor scans your card &amp;
                submits their contact info.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium cursor-pointer">{t("emailAlertsToggle")}</label>
            <input
              type="checkbox"
              checked={pro.enable_email_alerts !== false}
              onChange={(e) => updatePro("enable_email_alerts", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>
        </div>

        {pro.enable_email_alerts !== false && (
          <div className="mt-4 space-y-4 pt-3 border-t border-border/40">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("emailAlertsDestLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={pro.notify_email || card.email || ""}
                  onChange={(e) => updatePro("notify_email", sanitizeText(e.target.value, 100))}
                  placeholder="e.g. owner@company.com"
                  className="h-11 flex-1 rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={sendTestEmailAlert}
                  disabled={testingEmail}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 rtl:rotate-180" />
                  {testingEmail ? t("sendingTestEmail") : t("sendTestEmailBtn")}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t("leadsInboxHint")}</p>
            </div>
          </div>
        )}
      </div>

      {/* OPTIONAL SECONDARY FEATURE: ZAPIER / HTTP WEBHOOKS */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{t("webhookTitle")}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t("webhookOptional")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t("webhookDesc")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium cursor-pointer">{t("enableWebhookToggle")}</label>
            <input
              type="checkbox"
              checked={pro.enable_lead_webhook ?? false}
              onChange={(e) => updatePro("enable_lead_webhook", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>
        </div>

        {pro.enable_lead_webhook && (
          <div className="mt-4 space-y-3 pt-3 border-t border-border/40">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("webhookUrlLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={pro.webhook_url || ""}
                  onChange={(e) =>
                    updatePro("webhook_url", sanitizeUrl(e.target.value) || e.target.value)
                  }
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="h-11 flex-1 rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={sendTestWebhook}
                  disabled={testingWebhook}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 rtl:rotate-180" />
                  {testingWebhook ? "…" : t("testWebhookBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE 6: REMOVE BRANDING TOGGLE */}
      <div>
        <div className="glass rounded-2xl border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-[#E6D5AC]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold">{t("removeBrandingTitle")}</h4>
                <p className="text-[11px] text-muted-foreground">{t("removeBrandingDesc")}</p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={pro.remove_branding ?? false}
              onChange={(e) => updatePro("remove_branding", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* SAVE BUTTON BAR */}
      <div className="sticky bottom-6 z-20 flex items-center justify-between rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-muted-foreground">
            {isPro ? t("proFeaturesActiveOnAccount") : t("customizeSpecialFeatures")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void saveProFeatures()}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? t("saving") : t("saveProFeaturesBtn")}
        </button>
      </div>

      {/* SHARED PRO UPGRADE DIALOG */}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        source={upgradeSource}
        draft={card}
      />
    </div>
  );
}
