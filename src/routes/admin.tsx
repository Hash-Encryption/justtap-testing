import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Power, Trash2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { slugify, type Card } from "@/lib/card";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin portal — manage all cards" },
      { name: "description", content: "Master control panel for client accounts, card slugs and traffic." },
      { property: "og:title", content: "Admin portal — Tapt" },
      { property: "og:description", content: "Manage every client card, slug and traffic count." },
    ],
  }),
  component: AdminPage,
});

type Row = Card & { views: number; downloads: number; leads: number };

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    const [{ data: cards }, { data: events }, { data: leads }] = await Promise.all([
      supabase.from("cards").select("*").order("created_at", { ascending: false }),
      supabase.from("card_analytics").select("card_id, event_type"),
      supabase.from("card_leads").select("card_id"),
    ]);
    const ev = events ?? [];
    const ld = leads ?? [];
    setRows(
      ((cards as Card[]) ?? []).map((c) => ({
        ...c,
        views: ev.filter((e) => e.card_id === c.id && e.event_type === "page_view").length,
        downloads: ev.filter((e) => e.card_id === c.id && e.event_type === "vcard_download").length,
        leads: ld.filter((l) => l.card_id === c.id).length,
      })),
    );
    setFetching(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function createCard(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("cards").insert({
      user_id: newUser.trim() || null,
      slug: slugify(newSlug || newName),
      full_name: newName.trim(),
      phone: newPhone.trim() || "-",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Card created");
    setNewSlug("");
    setNewName("");
    setNewUser("");
    setNewPhone("");
    void load();
  }

  async function toggleActive(row: Row) {
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

  async function removeCard(row: Row) {
    const { error } = await supabase.from("cards").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Card deleted");
    void load();
  }

  if (loading || isAdmin === null) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your account doesn&apos;t have the admin role. Add a row to <code>user_roles</code> with
            role <code>admin</code> for your user id to unlock this panel.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const totalViews = rows.reduce((a, r) => a + r.views, 0);

  return (
    <main className="min-h-screen px-5 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Admin portal</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} cards · {totalViews} total scans
            </p>
          </div>
          <Link to="/dashboard" className="rounded-full border border-border px-4 py-2 text-xs">
            My dashboard
          </Link>
        </header>

        <form onSubmit={createCard} className="glass mt-5 grid gap-3 rounded-2xl p-5 sm:grid-cols-5">
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
            className="h-10 rounded-xl border border-border bg-transparent px-3 text-sm"
          />
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug"
            className="h-10 rounded-xl border border-border bg-transparent px-3 text-sm"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone"
            className="h-10 rounded-xl border border-border bg-transparent px-3 text-sm"
          />
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="Client user id (uuid)"
            className="h-10 rounded-xl border border-border bg-transparent px-3 text-sm"
          />
          <button
            type="submit"
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </form>

        <div className="glass mt-5 overflow-x-auto rounded-2xl p-5">
          {fetching ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Slug</th>
                  <th className="pb-2 pr-4">Client user</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 pr-4">Views</th>
                  <th className="pb-2 pr-4">Saves</th>
                  <th className="pb-2 pr-4">Leads</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2.5 pr-4 font-medium">{r.full_name}</td>
                    <td className="py-2.5 pr-4">
                      <a
                        href={`/c/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary"
                      >
                        {r.slug} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="max-w-[140px] truncate py-2.5 pr-4 text-xs text-muted-foreground">
                      {r.user_id ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2.5 pr-4">{r.views}</td>
                    <td className="py-2.5 pr-4">{r.downloads}</td>
                    <td className="py-2.5 pr-4">{r.leads}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          r.is_active ?? true
                            ? "bg-primary/15 text-primary"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {r.is_active ?? true ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2.5">
                      <button
                        type="button"
                        onClick={() => void toggleActive(r)}
                        aria-label="Toggle active"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeCard(r)}
                        aria-label="Delete card"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
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
    </main>
  );
}
