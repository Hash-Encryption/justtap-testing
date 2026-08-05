import { useEffect, useState } from "react";
import {
  Download,
  Globe,
  HeartHandshake,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { HeaderCut } from "./HeaderCut";
import { supabase } from "@/lib/supabase";
import { readableOn, type Card } from "@/lib/card";
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
  const [sending, setSending] = useState(false);
  const ar = lang === "ar" && card.enable_arabic;

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
    const form = new FormData(e.currentTarget);
    const sender_name = String(form.get("sender_name") || "").trim();
    const sender_phone = String(form.get("sender_phone") || "").trim();
    const note = String(form.get("note") || "").trim();
    if (!sender_name || !sender_phone) {
      toast.error(ar ? "الاسم والهاتف مطلوبان" : "Name and phone are required");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("card_leads").insert({
      card_id: card.id,
      sender_name,
      sender_phone,
      note: note || null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLeadOpen(false);
    toast.success(ar ? "تم إرسال معلوماتك!" : "Your info was sent!");
  }

  function saveContact() {
    if (preview) {
      toast.info("Preview mode — the .vcf download works on the live card.");
      return;
    }
    window.location.href = `/api/vcard/${card.slug}`;
  }

  const waHref = card.whatsapp_phone
    ? `https://wa.me/${card.whatsapp_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        card.whatsapp_message || "",
      )}`
    : null;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative mx-auto flex min-h-full w-full max-w-[430px] flex-col"
      style={{ backgroundColor: bg, color: ink }}
    >
      {/* HERO */}
      <div className="relative aspect-4/5 w-full overflow-hidden" style={{ backgroundColor: accent }}>
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

        {card.enable_arabic && (
          <div className="absolute top-4 end-4 flex overflow-hidden rounded-full bg-black/35 p-0.5 backdrop-blur-md">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition"
                style={
                  lang === l
                    ? { backgroundColor: accent, color: onAccent }
                    : { color: "#ffffff" }
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
            style={{ backgroundColor: bg, borderColor: accent, boxShadow: `0 6px 18px ${accent}55` }}
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
          className="flex items-center justify-between gap-3 rounded-full border p-2 backdrop-blur-xl"
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
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold tracking-wide transition active:scale-[0.98]"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            <Download className="h-4 w-4" />
            {ar ? "حفظ جهة الاتصال" : "SAVE CONTACT"}
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
    </div>
  );
}
