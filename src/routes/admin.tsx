import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Power,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { slugify, type Card } from "@/lib/card";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin portal — master control panel" },
      {
        name: "description",
        content: "Master control panel for client accounts, card slugs and system traffic.",
      },
      { property: "og:title", content: "Admin portal — Snap Connect" },
      {
        property: "og:description",
        content: "Manage client accounts, assign card slugs and review traffic metrics.",
      },
    ],
  }),
  component: AdminPage,
});

type CardRow = Card & { views: number; downloads: number; leads: number };

type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  cards_count: number;
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  // Admin Env Credentials Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("justtap_admin_session_token");
    }
    return null;
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoggingIn, setAuthLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<"clients" | "cards">("clients");
  const [cardRows, setCardRows] = useState<CardRow[]>([]);
  const [profileRows, setProfileRows] = useState<ProfileRow[]>([]);
  const [fetching, setFetching] = useState(true);

  // Client Account Creation Form State (Name, Email, Phone)
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Card Creation Form State (Name, Slug, Phone, Client User ID)
  const [cardName, setCardName] = useState("");
  const [cardSlug, setCardSlug] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [cardUserId, setCardUserId] = useState("");

  const isAuthorizedAdmin = !!adminToken || isAdmin;

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast.error("Please enter admin username and password");
      return;
    }

    setAuthLoggingIn(true);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("justtap_admin_session_token", data.token);
        setAdminToken(data.token);
        toast.success("Admin portal unlocked!");
      } else {
        toast.error(data.error || "Invalid admin credentials");
      }
    } catch {
      toast.error("Failed to authenticate admin session");
    } finally {
      setAuthLoggingIn(false);
    }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem("justtap_admin_session_token");
    setAdminToken(null);
    toast.info("Admin session locked");
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    setFetching(true);
    const [{ data: cards }, { data: events }, { data: leads }, { data: profiles }] =
      await Promise.all([
        supabase.from("cards").select("*").order("created_at", { ascending: false }),
        supabase.from("card_analytics").select("card_id, event_type"),
        supabase.from("card_leads").select("card_id"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

    const ev = events ?? [];
    const ld = leads ?? [];
    const rawCards = (cards as Card[]) ?? [];
    const rawProfiles = (profiles as ProfileRow[]) ?? [];

    setCardRows(
      rawCards.map((c) => ({
        ...c,
        views: ev.filter((e) => e.card_id === c.id && e.event_type === "page_view").length,
        downloads: ev.filter((e) => e.card_id === c.id && e.event_type === "vcard_download").length,
        leads: ld.filter((l) => l.card_id === c.id).length,
      })),
    );

    setProfileRows(
      rawProfiles.map((p) => ({
        ...p,
        cards_count: rawCards.filter((c) => c.user_id === p.user_id).length,
      })),
    );

    setFetching(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  // Handle Client Account Creation
  async function createClientAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      full_name: clientName.trim(),
      email: clientEmail.trim().toLowerCase(),
      phone: clientPhone.trim() || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Client account created successfully!");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    void load();
  }

  // Handle Card Creation for Client
  async function createCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardName.trim()) {
      toast.error("Card owner name is required");
      return;
    }

    const { error } = await supabase.from("cards").insert({
      user_id: cardUserId.trim() || null,
      slug: slugify(cardSlug || cardName),
      full_name: cardName.trim(),
      phone: cardPhone.trim() || "-",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Card created successfully!");
    setCardSlug("");
    setCardName("");
    setCardUserId("");
    setCardPhone("");
    void load();
  }

  function prepareCardForClient(profile: ProfileRow) {
    setActiveTab("cards");
    setCardName(profile.full_name);
    setCardPhone(profile.phone || "");
    if (profile.user_id) {
      setCardUserId(profile.user_id);
    }
    setCardSlug(slugify(profile.full_name));
    toast.info(`Preparing card creation for ${profile.full_name}`);
  }

  async function toggleActive(row: CardRow) {
    const { error } = await supabase
      .from("cards")
      .update({ is_active: !(row.is_active ?? true) })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  }

  async function removeCard(row: CardRow) {
    if (!confirm(`Are you sure you want to delete card "${row.full_name}"?`)) return;
    const { error } = await supabase.from("cards").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Card deleted");
    void load();
  }

  async function removeProfile(profile: ProfileRow) {
    if (!confirm(`Delete client profile for ${profile.full_name}?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Client profile removed");
    void load();
  }

  if (loading || isAdmin === null) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <div className="glass w-full max-w-md rounded-3xl border border-primary/30 p-8 shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-4 border border-primary/20">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-center">Admin Master Gateway</h1>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Restricted master management portal. Enter secure admin credentials to unlock.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Admin Username / Email
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin@justtap.me"
                required
                className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Admin Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-xs outline-none focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoggingIn}
              className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoggingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {authLoggingIn ? "Authenticating..." : "Unlock Admin Portal"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-4">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>Protected by Environment Credentials &amp; Rate Limiting</span>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Return to User Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const totalViews = cardRows.reduce((a, r) => a + r.views, 0);

  return (
    <main className="min-h-screen px-5 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Master Portal</h1>
            <p className="text-sm text-muted-foreground">
              {profileRows.length} client accounts · {cardRows.length} total cards · {totalViews}{" "}
              total scans
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAdminLogout}
              className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Lock Admin Session
            </button>
            <Link
              to="/dashboard"
              className="rounded-full border border-border px-4 py-2 text-xs hover:bg-accent transition-colors"
            >
              My Dashboard
            </Link>
          </div>
        </header>

        {/* Tab Selector */}
        <div className="mt-6 flex border-b border-border/80 gap-6">
          <button
            onClick={() => setActiveTab("clients")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "clients"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" /> Client Accounts ({profileRows.length})
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cards"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" /> Digital Cards ({cardRows.length})
          </button>
        </div>

        {/* CLIENTS TAB */}
        {activeTab === "clients" && (
          <div className="space-y-6 mt-5">
            {/* Create Client Account Form (Name, Email, Phone) */}
            <form
              onSubmit={createClientAccount}
              className="glass rounded-2xl p-5 border border-border/60"
            >
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Create Client Account
              </h2>
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Full Name *"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  required
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client Email Address *"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Phone Number (Optional)"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <button
                  type="submit"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" /> Add Client
                </button>
              </div>
            </form>

            {/* Clients Table */}
            <div className="glass overflow-x-auto rounded-2xl p-5 border border-border/60">
              {fetching ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              ) : profileRows.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No client accounts registered yet. Use the form above to add your first client.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3 pr-4">Client Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Phone</th>
                      <th className="pb-3 pr-4">Cards</th>
                      <th className="pb-3 pr-4">Created</th>
                      <th className="pb-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileRows.map((p) => (
                      <tr key={p.id} className="border-t border-border/60">
                        <td className="py-3 pr-4 font-medium">{p.full_name}</td>
                        <td className="py-3 pr-4 text-sm">{p.email}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {p.phone || "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {p.cards_count} {p.cards_count === 1 ? "card" : "cards"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => prepareCardForClient(p)}
                            className="mr-2 inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Make Card
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeProfile(p)}
                            aria-label="Delete client"
                            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* CARDS TAB */}
        {activeTab === "cards" && (
          <div className="space-y-6 mt-5">
            {/* Create Card Form */}
            <form onSubmit={createCard} className="glass rounded-2xl p-5 border border-border/60">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Create Digital Card (Optional Admin
                Action)
              </h2>
              <div className="grid gap-3 sm:grid-cols-5">
                <input
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Card Name *"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={cardSlug}
                  onChange={(e) => setCardSlug(e.target.value)}
                  placeholder="Custom slug (optional)"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={cardPhone}
                  onChange={(e) => setCardPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={cardUserId}
                  onChange={(e) => setCardUserId(e.target.value)}
                  placeholder="Client User ID (uuid)"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <button
                  type="submit"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" /> Create Card
                </button>
              </div>
            </form>

            {/* Cards Table */}
            <div className="glass overflow-x-auto rounded-2xl p-5 border border-border/60">
              {fetching ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              ) : cardRows.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No digital cards created yet. Clients can create cards from their dashboard, or
                  you can create one above.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3 pr-4">Card Name</th>
                      <th className="pb-3 pr-4">Slug</th>
                      <th className="pb-3 pr-4">Client User ID</th>
                      <th className="pb-3 pr-4">Created</th>
                      <th className="pb-3 pr-4">Scans</th>
                      <th className="pb-3 pr-4">Saves</th>
                      <th className="pb-3 pr-4">Leads</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardRows.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                        <td className="py-3 pr-4">
                          <a
                            href={`/c/${r.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {r.slug} <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="max-w-[130px] truncate py-3 pr-4 text-xs text-muted-foreground">
                          {r.user_id ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 pr-4 font-medium">{r.views}</td>
                        <td className="py-3 pr-4 font-medium">{r.downloads}</td>
                        <td className="py-3 pr-4 font-medium">{r.leads}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              (r.is_active ?? true)
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {(r.is_active ?? true) ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void toggleActive(r)}
                            title="Toggle active status"
                            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeCard(r)}
                            title="Delete card"
                            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
