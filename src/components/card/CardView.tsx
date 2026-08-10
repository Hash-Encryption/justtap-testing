import { useEffect, useState } from "react";
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
import { formatWhatsAppNumber, getEmbedVideoUrl, readableOn, type Card } from "@/lib/card";
import { checkRateLimit } from "@/lib/rate-limit";
import { LeadSubmissionSchema } from "@/lib/sanitization";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  card: Card;
  /** Preview mode disables analytics + outbound actions (dashboard editor). */
  preview?: boolean;
};

export function CardView({ card, preview = false }: Props) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [leadOpen, setLeadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
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

  const accent = card.accent_color || "#8b5cf6";
  const bg = card.bg_color || "#ffffff";
  const onAccent = readableOn(accent);
  const ink = readableOn(bg);

  const name = (ar && card.full_name_ar) || card.full_name || "Your Name";
  const title = (ar && card.title_ar) || card.title;
  const bio = (ar && card.bio_ar) || card.bio;
  const social = card.social_links ?? {};

  useEffect(() => {
    if (preview || !card.id) return;
    void supabase.from("card_analytics").insert({
      card_id: card.id,
      event_type: "page_view",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  }, [card.id, preview]);

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
      card_id: card.id,
      sender_name: String(form.get("sender_name") || ""),
      sender_phone: String(form.get("sender_phone") || ""),
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
    const { error } = await supabase.from("card_leads").insert({
      card_id: sanitized.card_id,
      sender_name: sanitized.sender_name,
      sender_phone: sanitized.sender_phone,
      note: sanitized.note,
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
        card_id: sanitized.card_id,
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
    window.location.href = `/api/vcard/${card.slug}`;
  }

  function getMobileWalletType(): "apple" | "google" {
    if (typeof navigator === "undefined") return "google";
    const ua = navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod|macintosh|mac os x/.test(ua);
    return isApple ? "apple" : "google";
  }

  function saveToWallet() {
    if (preview) {
      toast.info("Preview mode — Wallet pass download is live on published profile.");
      return;
    }
    const customPassUrl = card.pro_features?.wallet_pass_url;
    if (customPassUrl && customPassUrl.startsWith("http")) {
      window.location.href = customPassUrl;
      return;
    }
    const walletType = getMobileWalletType();
    if (walletType === "apple") {
      window.location.href = `/api/apple-wallet/${card.slug}`;
    } else {
      window.open(`/api/google-wallet/${card.slug}`, "_blank");
    }
  }

  const formattedWaNumber = formatWhatsAppNumber(card.whatsapp_phone || card.phone);

  const waHref = formattedWaNumber
    ? `https://wa.me/${formattedWaNumber}?text=${encodeURIComponent(card.whatsapp_message || "")}`
    : null;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative mx-auto flex min-h-full w-full max-w-[430px] flex-col"
      style={{ backgroundColor: bg, color: ink }}
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
          className="absolute top-4 start-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/50"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {card.enable_arabic && (
          <div className="absolute top-4 end-4 flex overflow-hidden rounded-full bg-black/35 p-0.5 backdrop-blur-md">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition"
                style={
                  lang === l ? { backgroundColor: accent, color: onAccent } : { color: "#ffffff" }
                }
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <HeaderCut pattern={card.header_pattern} bgColor={bg} accentColor={accent} />

        {card.show_logo_badge && card.logo_url && (
          <div
            className="absolute bottom-3 end-6 z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-lg ring-2"
            style={{
              backgroundColor: bg,
              borderColor: accent,
              boxShadow: `0 6px 18px ${accent}55`,
            }}
          >
            <img src={card.logo_url} alt="Logo" className="h-9 w-9 object-contain" />
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 px-6 pb-40 pt-2">
        <h1 className="text-2xl font-bold leading-tight">{name}</h1>
        {title && (
          <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
            {title}
          </p>
        )}
        {card.company && <p className="text-sm opacity-70">{card.company}</p>}
        {bio && <p className="mt-4 text-sm leading-relaxed opacity-80">{bio}</p>}

        <div className="mt-6 space-y-2">
          {card.phone && (
            <a
              href={`tel:${card.phone}`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
              style={{ backgroundColor: `${accent}14` }}
            >
              <Phone className="h-4 w-4" style={{ color: accent }} />
              <span dir="ltr">{card.phone}</span>
            </a>
          )}
          {card.email && (
            <a
              href={`mailto:${card.email}`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
              style={{ backgroundColor: `${accent}14` }}
            >
              <Mail className="h-4 w-4" style={{ color: accent }} />
              <span dir="ltr" className="truncate">
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
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition active:scale-[0.98]"
                style={{ borderColor: `${accent}33` }}
              >
                <Icon className="h-4 w-4" style={{ color: accent }} />
                {label}
              </a>
            ))}
          </div>
        )}

        {/* PRO SPECIAL FEATURES SECTION */}
        {(() => {
          const pro = card.pro_features;
          const isProActive =
            card.plan_tier === "pro" || card.plan_tier === "enterprise" || preview;
          if (!pro || !isProActive) return null;

          const embedUrl = getEmbedVideoUrl(pro.video_url);

          return (
            <div className="mt-5 space-y-3">
              {/* VIDEO EMBED BLOCK */}
              {embedUrl && (
                <div
                  className="overflow-hidden rounded-2xl border shadow-sm"
                  style={{ borderColor: `${accent}33` }}
                >
                  <iframe
                    src={embedUrl}
                    title="Video Intro"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* CALENDLY BOOKING BUTTON */}
              {pro.booking_url && (
                <a
                  href={pro.booking_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] shadow-md"
                  style={{ backgroundColor: accent }}
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
                  href={pro.pdf_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-medium transition active:scale-[0.98]"
                  style={{ borderColor: `${accent}33`, backgroundColor: `${accent}0a` }}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4" style={{ color: accent }} />
                    <span className="truncate">
                      {pro.pdf_label || (ar ? "تحميل ملف PDF" : "Download PDF")}
                    </span>
                  </div>
                  <Download className="h-4 w-4 opacity-70" style={{ color: accent }} />
                </a>
              )}

              {/* SAVE TO WALLET BUTTON */}
              {pro.enable_wallet_pass !== false && (
                <button
                  type="button"
                  onClick={saveToWallet}
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-semibold transition active:scale-[0.98] shadow-sm"
                  style={{ borderColor: `${accent}44`, backgroundColor: `${accent}0d` }}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="h-4 w-4" style={{ color: accent }} />
                    <span>{ar ? "حفظ في المحفظة" : "Save to Wallet"}</span>
                  </div>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </button>
              )}

              {/* CUSTOM CTA ACTION BUTTON */}
              {pro.custom_cta_label && pro.custom_cta_url && (
                <a
                  href={pro.custom_cta_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-semibold transition active:scale-[0.98]"
                  style={{ borderColor: accent, color: accent }}
                >
                  <span>{pro.custom_cta_label}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          );
        })()}

        {/* FOOTER WATERMARK */}
        {(!card.pro_features?.remove_branding || card.plan_tier === "free") && (
          <div className="mt-8 text-center text-[11px] font-medium opacity-50">
            Powered by <strong style={{ color: accent }}>JustTap</strong>
          </div>
        )}
      </div>

      {/* DOCK */}
      <div
        className={
          preview
            ? "sticky bottom-0 z-20 px-5 pb-5"
            : "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-5 pb-5"
        }
      >
        <div
          className="flex items-center justify-between gap-2.5 rounded-full border p-2 backdrop-blur-xl"
          style={{ backgroundColor: `${bg}d9`, borderColor: `${accent}2e` }}
        >
          <button
            type="button"
            onClick={() => setLeadOpen(true)}
            aria-label="Exchange info"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <HeartHandshake className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={saveContact}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold tracking-wider transition active:scale-[0.98] px-3"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">{ar ? "حفظ جهة الاتصال" : "SAVE CONTACT"}</span>
          </button>

          <button
            type="button"
            onClick={saveToWallet}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold tracking-wider transition active:scale-[0.98] px-3 shadow-md"
            style={{ backgroundColor: "#000000", color: "#ffffff" }}
          >
            <Wallet className="h-4 w-4 shrink-0 text-white" />
            <span className="truncate">{ar ? "حفظ في المحفظة" : "SAVE TO WALLET"}</span>
          </button>

          <a
            href={waHref ?? undefined}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="WhatsApp"
            onClick={(e) => {
              if (!waHref || preview) e.preventDefault();
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95"
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
            <input
              name="sender_name"
              required
              placeholder={ar ? "الاسم" : "Your name"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <input
              name="sender_phone"
              required
              inputMode="tel"
              placeholder={ar ? "رقم الهاتف" : "Your phone"}
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
            />
            <textarea
              name="note"
              rows={3}
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
              <span className="flex-1 truncate px-2 text-xs font-mono opacity-80">{cardUrl}</span>
              <button
                type="button"
                onClick={copyCardLink}
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white transition active:scale-95"
                style={{ backgroundColor: accent }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ" : "Copy"}
              </button>
            </div>

            {/* Social Sharing Icons */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my digital business card: ${cardUrl}`)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-xs font-medium transition hover:bg-secondary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <MessageCircle className="h-5 w-5" />
                </div>
                WhatsApp
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3 text-xs font-medium transition hover:bg-secondary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/10 text-blue-400">
                  <Linkedin className="h-5 w-5" />
                </div>
                LinkedIn
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Here is my digital card: ${cardUrl}`)}`}
                target="_blank"
                rel="noreferrer noopener"
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
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg mb-2"
              style={{ backgroundColor: accent }}
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
            className="my-4 rounded-2xl p-5 text-left text-white shadow-xl relative overflow-hidden"
            style={{ backgroundColor: accent }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                JUSTTAP DIGITAL PASS
              </span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold truncate">{name}</h3>
            <p className="text-xs opacity-90 truncate">{title || card.company || "Digital Pass"}</p>
            {card.phone && (
              <p className="mt-2 text-xs font-mono opacity-80" dir="ltr">
                {card.phone}
              </p>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            <a
              href={`/api/apple-wallet/${card.slug}`}
              download={`${card.slug}.pkpass`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-md transition active:scale-[0.98]"
              style={{ backgroundColor: "#000000" }}
            >
              <Wallet className="h-4 w-4 text-white" />
              {ar ? "إضافة إلى محفظة Apple (.pkpass)" : "Add to Apple Wallet (.pkpass)"}
            </a>

            <a
              href={`/api/google-wallet/${card.slug}`}
              target="_blank"
              rel="noreferrer noopener"
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
