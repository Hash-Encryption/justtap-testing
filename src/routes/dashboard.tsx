import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Inbox, LayoutGrid, Loader2, LogOut, Pencil, QrCode, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { emptyCard, type Card } from "@/lib/card";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { CardEditor } from "@/components/dashboard/CardEditor";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { LeadsTab } from "@/components/dashboard/LeadsTab";
import { QrTab } from "@/components/dashboard/QrTab";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — build your digital card" },
      {
        name: "description",
        content: "Design your NFC digital business card, track scans, read leads and download your QR code.",
      },
      { property: "og:title", content: "Card dashboard — Tapt" },
      { property: "og:description", content: "Live editor, analytics, leads and QR codes for your digital business card." },
    ],
  }),
  component: Dashboard,
});

type Tab = "card" | "analytics" | "leads" | "qr";

function Dashboard() {
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
    supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const existing = (data as Card | null) ?? null;
        setCard(existing);
        setDraft(existing ?? { ...emptyCard, user_id: user.id });
        setEditing(false);
        setFetching(false);
      });
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
    { id: "card", label: "My card", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "leads", label: "Leads", icon: <Inbox className="h-4 w-4" /> },
    { id: "qr", label: "QR code", icon: <QrCode className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="font-display text-base font-bold">
            tapt<span className="text-primary">.</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
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
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
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
                You don&apos;t have a digital business card created yet. Create your personalized profile to start sharing your contact info, social links, and QR codes via NFC.
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
              userId={user.id}
              isNew={!card}
              onSaved={(saved) => {
                setCard(saved);
                setDraft(saved);
                setEditing(false);
              }}
            />
          ))}

        {tab === "analytics" && card && <AnalyticsTab cardId={card.id} />}
        {tab === "leads" && card && <LeadsTab cardId={card.id} />}
        {tab === "qr" && card && <QrTab slug={card.slug} accent={card.accent_color} />}
      </div>
    </main>
  );
}
