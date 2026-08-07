import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Inbox,
  LayoutGrid,
  Loader2,
  LogOut,
  Pencil,
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
import { LeadsTab } from "@/components/dashboard/LeadsTab";
import { QrTab } from "@/components/dashboard/QrTab";

import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
      { title: "Dashboard — build your digital card" },
      {
        name: "description",
        content:
          "Design your NFC digital business card, track scans, read leads and download your QR code.",
      },
      { property: "og:title", content: "Card dashboard — JustTap" },
      {
        property: "og:description",
        content: "Live editor, analytics, leads and QR codes for your digital business card.",
      },
    ],
  }),
  component: Dashboard,
});

type Tab = "card" | "pro" | "analytics" | "leads" | "qr";

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [card, setCard] = useState<Card | null>(null);
  const [draft, setDraft] = useState<Card | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("card");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadUserCard() {
      if (!user) return;
      // 1. Check for pending guest draft to claim
      let guestPayload: Card | null = null;
      try {
        const stored =
          localStorage.getItem("justtap_guest_pending_card") ||
          sessionStorage.getItem("justtap_guest_pending_card");
        if (stored) {
          const parsed = JSON.parse(stored);
          const cardObj = parsed?.card ? parsed.card : parsed;
          if (cardObj?.full_name && cardObj?.phone) {
            guestPayload = cardObj as Card;
          }
        }
      } catch {
        /* ignore storage errors */
      }

      // Fetch user's existing cards
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const existing = (data as Card | null) ?? null;

      // If user has a guest draft and no published card yet, auto-publish guest draft
      if (guestPayload && !existing) {
        const slugToUse = guestPayload.slug;
        const avatar_url = await uploadDataUrlIfNeeded(guestPayload.avatar_url, user.id, "avatar");
        const logo_url = await uploadDataUrlIfNeeded(guestPayload.logo_url, user.id, "logo");

        const payload = {
          user_id: user.id,
          slug: slugToUse,
          full_name: guestPayload.full_name.trim(),
          phone: guestPayload.phone.trim(),
          email: guestPayload.email || user.email || null,
          title: guestPayload.title || null,
          company: guestPayload.company || null,
          bio: guestPayload.bio || null,
          avatar_url,
          logo_url,
          show_logo_badge: guestPayload.show_logo_badge,
          header_pattern: guestPayload.header_pattern,
          accent_color: guestPayload.accent_color,
          bg_color: guestPayload.bg_color,
          whatsapp_phone: guestPayload.whatsapp_phone || null,
          whatsapp_message: guestPayload.whatsapp_message || null,
          enable_arabic: guestPayload.enable_arabic,
          full_name_ar: guestPayload.full_name_ar || null,
          title_ar: guestPayload.title_ar || null,
          bio_ar: guestPayload.bio_ar || null,
          social_links: guestPayload.social_links ?? {},
          plan_tier: guestPayload.plan_tier || "free",
          pro_features: guestPayload.pro_features ?? {},
        };

        let { data: created, error } = await supabase
          .from("cards")
          .insert(payload)
          .select()
          .single();

        // If nickname is taken, append random suffix so guest card claiming doesn't fail
        if (error && error.code === "23505") {
          payload.slug = `${slugToUse}-${Math.floor(1000 + Math.random() * 9000)}`;
          const retry = await supabase.from("cards").insert(payload).select().single();
          created = retry.data;
          error = retry.error;
        }

        if (!error && created) {
          try {
            localStorage.removeItem("justtap_guest_pending_card");
            sessionStorage.removeItem("justtap_guest_pending_card");
          } catch {
            /* ignore storage errors */
          }

          const published = created as Card;
          setCard(published);
          setDraft(published);
          setEditing(false);
          setFetching(false);
          toast.success("Your digital card has been published and linked to your profile!");
          return;
        }
      }

      setCard(existing);
      setDraft(
        existing ??
          (guestPayload
            ? { ...guestPayload, user_id: user.id }
            : { ...emptyCard, user_id: user.id }),
      );
      setEditing(false);
      setFetching(false);
    }

    void loadUserCard();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || fetching || !user || !draft) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "card", label: t("myCardTab"), icon: <LayoutGrid className="h-4 w-4" /> },
    {
      id: "pro",
      label: "Special Features ⭐",
      icon: <Sparkles className="h-4 w-4 text-amber-400" />,
    },
    { id: "analytics", label: t("analyticsTab"), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "leads", label: t("leadsTab"), icon: <Inbox className="h-4 w-4" /> },
    { id: "qr", label: t("qrCodeTab"), icon: <QrCode className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="font-display text-base font-bold">
            {t("appName")}
            <span className="text-primary">.</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"
              >
                <Shield className="h-3.5 w-3.5" /> {t("adminPortal")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
            </button>
          </div>
        </div>
        {card && (
          <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-5 pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {tab === "card" &&
          (card && !editing ? (
            <div>
              <h1 className="font-display text-xl font-bold">My Digital Card</h1>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="glass mt-4 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-primary border border-border/60"
              >
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-xl font-bold"
                  style={{ backgroundColor: card.accent_color, color: "#fff" }}
                >
                  {card.avatar_url ? (
                    <img src={card.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    card.full_name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{card.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">/c/{card.slug}</p>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : !card && !editing ? (
            <div className="glass rounded-3xl p-8 text-center border border-border/60">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
                <LayoutGrid className="h-8 w-8" />
              </div>
              <h1 className="font-display text-2xl font-bold">Welcome to Snap Connect</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                You don&apos;t have a digital business card created yet. Create your personalized
                profile to start sharing your contact info, social links, and QR codes via NFC.
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Pencil className="h-4 w-4" /> Create My Digital Card
              </button>
            </div>
          ) : (
            <CardEditor
              draft={draft}
              setDraft={setDraft}
              userId={user?.id ?? "guest"}
              isNew={!card}
              onSaved={(saved) => {
                setCard(saved);
                setDraft(saved);
                setEditing(false);
              }}
            />
          ))}

        {tab === "pro" && draft && (
          <ProFeaturesTab
            card={draft}
            userId={user.id}
            onChange={(updated) => {
              setDraft(updated);
              if (card) {
                setCard(updated);
              }
            }}
          />
        )}
        {tab === "analytics" && card && <AnalyticsTab cardId={card.id} />}
        {tab === "leads" && card && <LeadsTab cardId={card.id} />}
        {tab === "qr" && card && <QrTab slug={card.slug} accent={card.accent_color} />}
      </div>
    </main>
  );
}
