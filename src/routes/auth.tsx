import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type AuthSearch = {
  mode?: "signin" | "signup" | undefined;
  claim_draft?: boolean | undefined;
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: typeof search["mode"] === "string" ? (search["mode"] as "signin" | "signup") : undefined,
    claim_draft: search["claim_draft"] === true || search["claim_draft"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — JustTap digital business cards" },
      { name: "description", content: "Sign in or create an account to build and manage your NFC digital business card." },
      { property: "og:title", content: "Sign in — JustTap" },
      { property: "og:description", content: "Access your digital business card dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("justtap_guest_pending_card") || sessionStorage.getItem("justtap_guest_pending_card");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.card?.full_name) {
          setHasPendingDraft(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.success("Check your email to confirm your account.");
        return;
      }
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <main className="grid min-h-screen place-items-center grid-glow px-6">
      <div className="glass w-full max-w-sm rounded-3xl p-7">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-bold">
            {t("appName")}<span className="text-primary">.</span>
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">
          {mode === "signin" ? t("welcomeBack") : t("createAccount")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? t("signInDesc") : t("signUpDesc")}
        </p>

        {hasPendingDraft && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <span className="font-semibold">{t("draftNoticeTitle")}</span>
            <p className="mt-0.5 opacity-90">{t("draftNoticeDesc")}</p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? t("pleaseWait") : mode === "signin" ? t("submitSignIn") : t("submitSignUp")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? t("noAccountPrompt") : t("hasAccountPrompt")}
        </button>
      </div>
    </main>
  );
}
