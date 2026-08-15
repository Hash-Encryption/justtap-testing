import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HeartHandshake,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  Twitter,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { HeaderCut } from "./HeaderCut";
import { supabase } from "@/lib/supabase";
import {
  createAnalyticsEventContext,
  trackProfileQrPageView,
  trackPublicCardEvent,
  type AnalyticsEntrySource,
} from "@/lib/analytics";
import { formatWhatsAppNumber, getEmbedVideoUrl, type Card } from "@/lib/card";
import type { PublicCard } from "@/lib/public-card";
import { checkRateLimit } from "@/lib/rate-limit";
import { LeadSubmissionSchema } from "@/lib/sanitization";
import { cardFont, cardRadius, resolveCardDesign } from "@/lib/card-design";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  card: Card | PublicCard;
  /** Preview mode disables analytics + outbound actions (dashboard editor). */
  preview?: boolean;
  /** Entry attribution applies only to the initial public page view. */
  entrySource?: AnalyticsEntrySource;
};

function outboundLinkProps(href: string | null | undefined, preview: boolean, newTab = false) {
  if (preview || !href) return { "aria-disabled": true as const, tabIndex: -1 };
  return newTab ? { href, target: "_blank" as const, rel: "noreferrer noopener" } : { href };
}

export function CardView({ card, preview = false, entrySource = "direct" }: Props) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [leadOpen, setLeadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const pageViewContext = useRef<ReturnType<typeof createAnalyticsEventContext> | null>(null);
  const ar = lang === "ar" && card.enable_arabic;

  const cardUrl =
    typeof window !== "undefined" ? `${window.location.origin}/c/${card.slug}` : `/c/${card.slug}`;

  async function handleShare() {
    if (preview) {
      toast.info("Preview mode — share card is live on published profile.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: card.full_name,
          text: `Digital business card for ${card.full_name}`,
          url: cardUrl,
        });
        return;
      } catch {
        // Fallback to modal if Web Share is cancelled or unsupported
      }
    }
    setShareOpen(true);
  }

  function copyCardLink() {
    void navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    toast.success("Card link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  const design = resolveCardDesign(card);
  const accent = design.accentColor;
  const bg = design.bgColor;
  const surface = design.surfaceColor;
  const champagne = design.champagneAccent;
  const text = design.textColor;
  const onAccent = design.onAccentColor;
  const finishStyle =
    design.surfaceFinish === "glassmorphism"
      ? {
          backgroundColor: `${surface}e6`,
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          borderColor: `${champagne}26`,
        }
      : design.surfaceFinish === "carbon_grain"
        ? {
            backgroundColor: surface,
            backgroundImage: `linear-gradient(45deg, ${text}0a 25%, transparent 25%, transparent 75%, ${text}0a 75%), linear-gradient(45deg, ${text}0a 25%, transparent 25%, transparent 75%, ${text}0a 75%)`,
            backgroundPosition: "0 0, 4px 4px",
            backgroundSize: "8px 8px",
            borderColor: `${champagne}1f`,
          }
        : design.surfaceFinish === "matte"
          ? {
              backgroundColor: surface,
              backgroundImage: `radial-gradient(circle at 20% 0%, ${text}0d, transparent 38%)`,
              borderColor: `${text}14`,
            }
          : { backgroundColor: surface, borderColor: surface };

  const name = (ar && card.full_name_ar) || card.full_name || "Your Name";
  const title = (ar && card.title_ar) || card.title;
  const bio = (ar && card.bio_ar) || card.bio;
  const social = card.social_links ?? {};
  const isPublicCard = "public_features_enabled" in card;
  const publicFeatures = isPublicCard ? card.public_features : card.pro_features;
  const publicFeaturesEnabled = isPublicCard
    ? card.public_features_enabled
    : card.plan_tier === "pro" || card.plan_tier === "enterprise" || preview;
  const showBranding = isPublicCard
    ? card.show_branding
    : !card.pro_features?.remove_branding || card.plan_tier === "free";

  useEffect(() => {
    if (preview || entrySource === "permanent_tag") return;
    pageViewContext.current ??= createAnalyticsEventContext();
    void (entrySource === "profile_qr"
      ? trackProfileQrPageView(card.slug, pageViewContext.current)
      : trackPublicCardEvent(card.slug, "page_view", pageViewContext.current));
  }, [card.slug, entrySource, preview]);

  const socials = [
    { key: "linkedin", href: social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { key: "instagram", href: social.instagram, label: "Instagram", Icon: Instagram },
    { key: "twitter", href: social.twitter, label: "X / Twitter", Icon: Twitter },
    { key: "website", href: social.website, label: "Website", Icon: Globe },
  ].filter((s) => !!s.href);

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) {
      toast.info("Preview mode — lead capture is live on the published card.");
      return;
    }

    // 1. Client-side rate limiting (max 3 lead submissions per minute)
    const rateCheck = checkRateLimit(`lead:${card.id}`, 3, 60_000);
    if (!rateCheck.allowed) {
      toast.error(
        ar
          ? "لقد تجاوزت الحد المسموح. يرجى الانتظار دقيقة."
          : "Too many attempts. Please wait a minute before submitting again.",
      );
      return;
    }

    const form = new FormData(e.currentTarget);
    const rawData = {
      card_slug: card.slug,
      sender_name: String(form.get("sender_name") || ""),
      sender_phone: String(form.get("sender_phone") || ""),
      sender_email: String(form.get("sender_email") || ""),
      sender_company: String(form.get("sender_company") || ""),
      sender_job_title: String(form.get("sender_job_title") || ""),
      note: String(form.get("note") || "") || null,
    };

    // 2. Validate & sanitize input via Zod schema
    const parsed = LeadSubmissionSchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message;
      toast.error(issue || (ar ? "تأكد من البيانات المدخلة" : "Please check your inputs"));
      return;
    }

    const sanitized = parsed.data;

    setSending(true);
    const { error } = await supabase.rpc("create_public_connection", {
      _card_slug: sanitized.card_slug,
      _sender_name: sanitized.sender_name,
      _sender_phone: sanitized.sender_phone,
      _sender_email: sanitized.sender_email,
      _sender_company: sanitized.sender_company,
      _sender_job_title: sanitized.sender_job_title,
      _visitor_note: sanitized.note,
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Fire background lead email notification asynchronously
    void fetch("/api/lead-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: card.id,
        sender_name: sanitized.sender_name,
        sender_phone: sanitized.sender_phone,
        note: sanitized.note,
      }),
    }).catch(() => {});

    setLeadOpen(false);
    toast.success(ar ? "تم إرسال معلوماتك بنجاح!" : "Your info was sent successfully!");
  }

  function saveContact() {
    if (preview) {
      toast.info("Preview mode — the .vcf download works on the live card.");
      return;
    }
    const analytics = createAnalyticsEventContext();
    const query = new URLSearchParams({ event_id: analytics.eventId });
    if (analytics.sessionId) query.set("session_id", analytics.sessionId);
    if (analytics.metadata.referrer_host) {
      query.set("referrer_host", analytics.metadata.referrer_host);
    }
    if (analytics.metadata.device_category) {
      query.set("device_category", analytics.metadata.device_category);
    }
    window.location.href = `/api/vcard/${card.slug}?${query}`;
  }

  const formattedWaNumber = formatWhatsAppNumber(card.whatsapp_phone || card.phone);

  const waHref = formattedWaNumber
    ? `https://wa.me/${formattedWaNumber}?text=${encodeURIComponent(card.whatsapp_message || "")}`
    : null;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-card-design={design.mode}
      data-header-pattern={design.headerPattern}
      data-surface-finish={design.surfaceFinish}
      data-border-radius={design.borderRadius}
      data-font-family={design.fontFamily}
      className="justtap-card justtap-card-enter relative mx-auto flex min-h-full w-full max-w-[430px] touch-pan-y flex-col overflow-x-clip border shadow-2xl"
      style={{
        backgroundColor: bg,
        borderColor: `${champagne}24`,
        borderRadius: cardRadius(design.borderRadius),
        color: text,
        fontFamily: cardFont(design.fontFamily),
      }}
    >
      {/* HERO */}
      <div
        className="relative aspect-4/5 w-full overflow-hidden"
        style={{ backgroundColor: accent }}
      >
        {card.avatar_url ? (
          <img
            src={card.avatar_url}
            alt={name}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-6xl font-semibold"
            style={{ color: onAccent }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Share Button top-start */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share card"
          className="absolute top-4 start-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/60"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {card.enable_arabic && (
          <div className="absolute top-4 end-4 flex gap-1 overflow-hidden rounded-full bg-black/45 p-1 backdrop-blur-md">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                aria-label={l === "ar" ? "عرض البطاقة بالعربية" : "Show card in English"}
                className="min-h-11 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition"
                style={
                  lang === l ? { backgroundColor: accent, color: onAccent } : { color: "#ffffff" }
                }
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <HeaderCut pattern={design.headerPattern} bgColor={surface} accentColor={champagne} />

        {card.show_logo_badge && card.logo_url && (
          <div
            className="absolute bottom-3 end-6 z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-lg ring-2"
            style={{
              backgroundColor: surface,
              borderColor: accent,
              boxShadow: `0 6px 18px ${accent}55`,
            }}
          >
            <img
              src={card.logo_url}
              alt={`${card.company || name} logo`}
              className="h-9 w-9 object-contain"
            />
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 border-t px-5 pb-40 pt-3 sm:px-6" style={finishStyle}>
        <h1 className="break-words text-2xl font-bold leading-tight sm:text-[1.75rem]">{name}</h1>
        {title && (
          <p className="mt-1 break-words text-sm font-medium" style={{ color: champagne }}>
            {title}
          </p>
        )}
        {card.company && <p className="break-words text-sm">{card.company}</p>}
        {bio && (
          <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed">{bio}</p>
        )}

        <div className="mt-6 space-y-2">
          {card.phone && (
            <a
              {...outboundLinkProps(`tel:${card.phone}`, preview)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
              style={{ backgroundColor: `${accent}24`, border: `1px solid ${accent}33` }}
            >
              <Phone className="h-4 w-4" style={{ color: champagne }} />
              <span dir="ltr">{card.phone}</span>
            </a>
          )}
          {card.email && (
            <a
              {...outboundLinkProps(`mailto:${card.email}`, preview)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
              style={{ backgroundColor: `${accent}24`, border: `1px solid ${accent}33` }}
            >
              <Mail className="h-4 w-4" style={{ color: champagne }} />
              <span dir="ltr" className="min-w-0 break-all text-start">
                {card.email}
              </span>
            </a>
          )}
        </div>

        {socials.length > 0 && (
          <div className="mt-4 space-y-2">
            {socials.map(({ key, href, label, Icon }) => (
              <a
                key={key}
                {...outboundLinkProps(href, preview, true)}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
                style={{ borderColor: `${champagne}33`, backgroundColor: `${text}08` }}
              >
                <Icon className="h-4 w-4" style={{ color: champagne }} />
                {label}
              </a>
            ))}
          </div>
        )}

        {/* PRO SPECIAL FEATURES SECTION */}
        {(() => {
          const pro = publicFeatures;
          const isProActive = publicFeaturesEnabled;
          if (!pro || !isProActive) return null;

          const embedUrl = getEmbedVideoUrl(pro.video_url);

          return (
            <div className="mt-5 space-y-3">
              {/* VIDEO EMBED BLOCK */}
              {embedUrl && (
                <div
                  className="overflow-hidden rounded-2xl border shadow-sm"
                  style={{ borderColor: `${champagne}33` }}
                >
                  {preview ? (
                    <div
                      role="img"
                      aria-label="Video preview placeholder"
                      data-video-preview-placeholder
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: `${accent}14`, color: champagne }}
                    >
                      <Video className="h-8 w-8" aria-hidden="true" />
                      <span className="text-xs font-semibold">Video on published card</span>
                    </div>
                  ) : (
                    <iframe
                      src={embedUrl}
                      title="Video Intro"
                      className="aspect-video w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              )}

              {/* CALENDLY BOOKING BUTTON */}
              {pro.booking_url && (
                <a
                  {...outboundLinkProps(pro.booking_url, preview, true)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold transition active:scale-[0.98] shadow-md"
                  style={{ backgroundColor: accent, color: onAccent }}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4" />
                    <span>{ar ? "حجز موعد" : "Book Meeting"}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </a>
              )}

              {/* PDF ATTACHMENT */}
              {pro.pdf_url && (
                <a
                  {...outboundLinkProps(pro.pdf_url, preview, true)}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-medium transition active:scale-[0.98]"
                  style={{ borderColor: `${champagne}33`, backgroundColor: `${accent}14` }}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4" style={{ color: champagne }} />
                    <span className="truncate">
                      {pro.pdf_label || (ar ? "تحميل ملف PDF" : "Download PDF")}
                    </span>
                  </div>
                  <Download className="h-4 w-4" style={{ color: champagne }} />
                </a>
              )}

              {/* CUSTOM CTA ACTION BUTTON */}
              {pro.custom_cta_label && pro.custom_cta_url && (
                <a
                  {...outboundLinkProps(pro.custom_cta_url, preview, true)}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-semibold transition active:scale-[0.98]"
                  style={{ borderColor: accent, color: champagne }}
                >
                  <span>{pro.custom_cta_label}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          );
        })()}

        {/* FOOTER WATERMARK */}
        {showBranding && (
          <div className="mt-8 text-center text-[11px] font-medium">
            Powered by <strong style={{ color: champagne }}>JustTap</strong>
          </div>
        )}
      </div>

      {/* DOCK */}
      <div
        className={
          preview
            ? "sticky bottom-0 z-20 px-2 pb-2"
            : "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-5 pb-5"
        }
      >
        <div
          data-card-dock
          className={
            preview
              ? "grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
              : "flex items-center justify-between gap-2.5 rounded-full border p-2 backdrop-blur-xl"
          }
          style={{ backgroundColor: `${bg}d9`, borderColor: `${accent}2e` }}
        >
          <button
            data-card-action="exchange"
            type="button"
            onClick={() => setLeadOpen(true)}
            aria-label="Exchange info"
            className={`${preview ? "h-10 w-10" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-full transition active:scale-95`}
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <HeartHandshake className="h-5 w-5" />
          </button>

          <button
            data-card-action="save"
            type="button"
            onClick={saveContact}
            className={`${preview ? "h-10 min-w-0 gap-1 px-1 text-[9px]" : "h-12 gap-2 text-[11px] sm:text-sm"} flex flex-1 items-center justify-center rounded-full font-semibold tracking-wide whitespace-nowrap transition active:scale-[0.98]`}
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <Download className="h-4 w-4" />
            <span className={preview ? "truncate" : undefined}>
              {ar ? "حفظ جهة الاتصال" : "SAVE CONTACT"}
            </span>
          </button>

          <a
            data-card-action="whatsapp"
            {...outboundLinkProps(waHref, preview, true)}
            aria-label="WhatsApp"
            className={`${preview ? "h-10 w-10" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-full text-white transition active:scale-95`}
            style={{ backgroundColor: waHref ? "#25D366" : `${accent}55` }}
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </div>

      <Drawer open={leadOpen} onOpenChange={setLeadOpen}>
        <DrawerContent className="mx-auto max-w-[430px]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{ar ? "تبادل المعلومات" : "Exchange Info"}</DrawerTitle>
            <DrawerDescription>
              {ar
                ? "شارك تفاصيلك وسيتم إرسالها مباشرة."
                : "Share your details and they'll land straight in the inbox."}
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={submitLead} className="space-y-3 px-4 pb-8" dir={ar ? "rtl" : "ltr"}>
            <label htmlFor="lead-name" className="sr-only">
              {ar ? "الاسم" : "Your name"}
            </label>
            <input
              id="lead-name"
              name="sender_name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder={ar ? "الاسم" : "Your name"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <label htmlFor="lead-phone" className="sr-only">
              {ar ? "رقم الهاتف" : "Your phone"}
            </label>
            <input
              id="lead-phone"
              name="sender_phone"
              autoComplete="tel"
              required
              inputMode="tel"
              maxLength={30}
              placeholder={ar ? "رقم الهاتف" : "Your phone"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <label htmlFor="lead-email" className="sr-only">
              {ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
            </label>
            <input
              id="lead-email"
              name="sender_email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder={ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <label htmlFor="lead-company" className="sr-only">
              {ar ? "الشركة (اختياري)" : "Company (optional)"}
            </label>
            <input
              id="lead-company"
              name="sender_company"
              autoComplete="organization"
              maxLength={160}
              placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <label htmlFor="lead-job-title" className="sr-only">
              {ar ? "المسمى الوظيفي (اختياري)" : "Job title (optional)"}
            </label>
            <input
              id="lead-job-title"
              name="sender_job_title"
              autoComplete="organization-title"
              maxLength={160}
              placeholder={ar ? "المسمى الوظيفي (اختياري)" : "Job title (optional)"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <label htmlFor="lead-note" className="sr-only">
              {ar ? "ملاحظة قصيرة" : "Short note (optional)"}
            </label>
            <textarea
              id="lead-note"
              name="note"
              rows={3}
              maxLength={1000}
              placeholder={ar ? "ملاحظة قصيرة" : "Short note (optional)"}
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={sending}
              className="h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: onAccent }}
            >
              {sending ? "…" : ar ? "أرسل معلوماتي" : "Send My Info"}
            </button>
          </form>
        </DrawerContent>
      </Drawer>

      {/* SHARE DRAWER */}
      <Drawer open={shareOpen} onOpenChange={setShareOpen}>
        <DrawerContent className="mx-auto max-w-[430px] p-6">
          <DrawerHeader className="px-0 pt-0 text-start">
            <DrawerTitle>{ar ? "مشاركة البطاقة الرقمية" : "Share Digital Card"}</DrawerTitle>
            <DrawerDescription>
              {ar
                ? "انشر رابط بطاقتك المعزز بالمعاينة الاجتماعية التفاعلية."
                : "Share your card link enriched with dynamic social preview cards."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 pt-2">
            {/* Copy Link Input */}
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/30 p-2">
              <span className="flex-1 truncate px-2 text-xs font-mono">{cardUrl}</span>
              <button
                type="button"
                onClick={copyCardLink}
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-95"
                style={{ backgroundColor: accent, color: onAccent }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ" : "Copy"}
              </button>
            </div>

            {/* Social Sharing Icons */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <a
                {...outboundLinkProps(
                  `https://wa.me/?text=${encodeURIComponent(`Check out my digital business card: ${cardUrl}`)}`,
                  preview,
                  true,
                )}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-xs font-medium transition hover:bg-secondary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <MessageCircle className="h-5 w-5" />
                </div>
                WhatsApp
              </a>

              <a
                {...outboundLinkProps(
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}`,
                  preview,
                  true,
                )}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-xs font-medium transition hover:bg-secondary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/10 text-blue-400">
                  <Linkedin className="h-5 w-5" />
                </div>
                LinkedIn
              </a>

              <a
                {...outboundLinkProps(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Here is my digital card: ${cardUrl}`)}`,
                  preview,
                  true,
                )}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-xs font-medium transition hover:bg-secondary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-500/10 text-sky-400">
                  <Twitter className="h-5 w-5" />
                </div>
                X (Twitter)
              </a>
            </div>

            {/* Social OpenGraph Preview Card Banner */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Social Share Card Preview (OpenGraph)
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <img
                src={`/api/og/${card.slug}`}
                alt="OpenGraph Social Preview"
                className="w-full rounded-xl border border-border shadow-sm object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* WALLET PASS DRAWER */}
      <Drawer open={walletOpen} onOpenChange={setWalletOpen}>
        <DrawerContent className="mx-auto max-w-[430px] p-6 text-center">
          <DrawerHeader className="px-0 pt-0 text-center">
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl shadow-lg mb-2"
              style={{ backgroundColor: accent, color: onAccent }}
            >
              <Wallet className="h-7 w-7" />
            </div>
            <DrawerTitle className="font-display text-xl font-bold">
              {ar ? "محفظة Apple & Google الرقمية" : "Apple & Google Wallet Pass"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              {ar
                ? "احفظ بطاقة الأعمال الرقمية مباشرة في محفظة الجوال الخاصة بك مع جهات الاتصال."
                : "Save this digital business card pass directly to your mobile wallet or address book."}
            </DrawerDescription>
          </DrawerHeader>

          {/* Pass Preview Card */}
          <div
            className="my-4 rounded-2xl p-5 text-left shadow-xl relative overflow-hidden"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                JUSTTAP DIGITAL PASS
              </span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold truncate">{name}</h3>
            <p className="text-xs truncate">{title || card.company || "Digital Pass"}</p>
            {card.phone && (
              <p className="mt-2 text-xs font-mono" dir="ltr">
                {card.phone}
              </p>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            <a
              {...outboundLinkProps(`/api/wallet/${card.slug}`, preview)}
              download={`${card.slug}.pkpass`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-md transition active:scale-[0.98]"
              style={{ backgroundColor: "#000000" }}
            >
              <Wallet className="h-4 w-4 text-white" />
              {ar ? "إضافة إلى محفظة Apple (.pkpass)" : "Add to Apple Wallet (.pkpass)"}
            </a>

            <a
              {...outboundLinkProps(`/api/google-wallet/${card.slug}`, preview, true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-md transition active:scale-[0.98]"
              style={{ backgroundColor: "#4285F4" }}
            >
              <Wallet className="h-4 w-4 text-white" />
              {ar ? "حفظ في محفظة Google" : "Save to Google Wallet"}
            </a>

            <button
              type="button"
              onClick={() => {
                saveContact();
                setWalletOpen(false);
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-semibold border border-border text-foreground transition active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              {ar ? "تحميل جهة الاتصال (.vcf)" : "Save Contact Card (.vcf)"}
            </button>

            <button
              type="button"
              onClick={() => setWalletOpen(false)}
              className="h-9 w-full rounded-2xl text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {ar ? "إغلاق" : "Close"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
