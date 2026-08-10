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
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { defaultProFeatures, type Card, type PlanTier, type ProFeatures } from "@/lib/card";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  card: Card;
  onChange: (updated: Card) => void;
  userId: string;
};

export function ProFeaturesTab({ card, onChange, userId }: Props) {
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const planTier: PlanTier = card.plan_tier || "free";
  const isPro = planTier === "pro" || planTier === "enterprise";
  const pro: ProFeatures = card.pro_features || defaultProFeatures;

  const updatePro = <K extends keyof ProFeatures>(key: K, value: ProFeatures[K]) => {
    const updatedPro = { ...(card.pro_features || defaultProFeatures), [key]: value };
    onChange({ ...card, pro_features: updatedPro });
  };

  async function saveProFeatures() {
    if (!card.id) {
      toast.error("Please publish your card first before saving special features.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("cards")
      .update({
        pro_features: card.pro_features || defaultProFeatures,
        plan_tier: card.plan_tier || "free",
      })
      .eq("id", card.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error(`Failed to save special features: ${error.message}`);
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

    setTestingEmail(true);
    try {
      const res = await fetch("/api/lead-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          sender_name: "Sarah Smith (Demo Lead)",
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

    setTestingWebhook(true);
    try {
      const res = await fetch("/api/lead-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          sender_name: "Test Visitor (Zapier Demo)",
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

  const toggleDemoPro = () => {
    const newTier: PlanTier = isPro ? "free" : "pro";
    onChange({ ...card, plan_tier: newTier });
    toast.success(
      newTier === "pro"
        ? "✨ Pro Tier activated in Demo mode! All special features are now live on your card."
        : "Switched back to Free Tier mode.",
    );
  };

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

    setUploadingPdf(true);
    try {
      const path = `${userId}/docs/pdf_${crypto.randomUUID()}.pdf`;
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
            <button
              type="button"
              onClick={toggleDemoPro}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                isPro
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {isPro ? "Pro Status: Active" : "Toggle Pro Demo Mode"}
            </button>

            {!isPro && (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {!isPro && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-500">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              You are currently on the <strong>Free Plan</strong>. You can customize these special
              features below and preview them in the live simulator, but upgrade to Pro ($9.99/mo)
              to make them live for public visitors.
            </span>
          </div>
        )}
      </div>

      {/* FEATURE 1: VIDEO INTRO EMBED */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400">
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
            placeholder="https://www.youtube.com/watch?v=... or Loom / Vimeo URL"
            className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
          />
          {pro.video_url && (
            <p className="text-[11px] text-emerald-400">
              ✓ Valid video link attached. Preview is ready in the mobile frame!
            </p>
          )}
        </div>
      </div>

      {/* FEATURE 2: DOCUMENT & PDF ATTACHMENT */}
      <div className="glass relative rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
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
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
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
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
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
            <label className="text-xs font-medium cursor-pointer">Email Alerts</label>
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
                Destination Email Address for Lead Notifications
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
                  <Send className="h-3.5 w-3.5" />
                  {testingEmail ? "Sending..." : "Send Test Email Alert"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Leads are also saved permanently in your{" "}
                <strong className="text-foreground">Leads Inbox</strong> tab for CSV export.
              </p>
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
                <h3 className="font-semibold text-sm">Advanced HTTP Webhook (Zapier / Make.com)</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Optional
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Forward raw JSON lead payloads to external automation systems or custom APIs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium cursor-pointer">Enable Webhook</label>
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
                Webhook Catch Endpoint URL
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
                  <Send className="h-3.5 w-3.5" />
                  {testingWebhook ? "…" : "Test Webhook"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE 6: APPLE & GOOGLE WALLET & BRANDING TOGGLES */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold">Apple & Google Wallet Pass</h4>
                <p className="text-[11px] text-muted-foreground">
                  Allow visitors to save card to Apple Wallet.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={pro.enable_wallet_pass ?? true}
              onChange={(e) => updatePro("enable_wallet_pass", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>
        </div>

        <div className="glass rounded-2xl border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500/10 text-pink-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold">Remove Branding Badge</h4>
                <p className="text-[11px] text-muted-foreground">
                  Hide &quot;Powered by JustTap&quot; footer watermark.
                </p>
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
            {isPro ? "Pro features active on your account" : "Customize special features & publish"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void saveProFeatures()}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Publish Special Features"}
        </button>
      </div>

      {/* UPGRADE DIALOG MODAL */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 text-center">
          <DialogHeader>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-lg mb-2">
              <Sparkles className="h-7 w-7" />
            </div>
            <DialogTitle className="font-display text-xl font-bold">
              Upgrade to JustTap Pro
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Unlock video embeds, PDF downloads, Calendly appointment booking, Apple Wallet passes,
              and custom branding for your physical NFC business cards.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2 rounded-2xl bg-secondary/50 p-4 text-left text-xs">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              Embedded YouTube, Loom, & Vimeo Video Intros
            </div>
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              PDF Document Uploader & Download Buttons
            </div>
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              Calendly & TidyCal Meeting Booking Embeds
            </div>
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              Remove &quot;Powered by JustTap&quot; Branding
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                toggleDemoPro();
                setUpgradeOpen(false);
              }}
              className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Activate Pro ($9.99/mo) — Instant Unlock
            </button>
            <button
              type="button"
              onClick={() => setUpgradeOpen(false)}
              className="h-10 w-full rounded-2xl text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Maybe Later
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
