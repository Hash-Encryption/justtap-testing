import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { emptyCard, type Card } from "@/lib/card";
import { CardEditor } from "@/components/dashboard/CardEditor";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { slugValidationMessage, validateSlug } from "@/lib/slug";

export const Route = createFileRoute("/builder")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create Your Digital Business Card — JustTap" },
      {
        name: "description",
        content: "Design your custom NFC digital business card instantly without an account.",
      },
    ],
  }),
  component: BuilderPage,
});

const GUEST_DRAFT_KEY = "justtap_guest_pending_card";

function BuilderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Card>(() => {
    try {
      const stored =
        localStorage.getItem(GUEST_DRAFT_KEY) || sessionStorage.getItem(GUEST_DRAFT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const cardData = parsed?.card ? parsed.card : parsed;
        if (cardData && (cardData.full_name || cardData.phone || cardData.title || cardData.bio)) {
          return cardData as Card;
        }
      }
    } catch {
      /* ignore storage errors */
    }
    return { ...emptyCard, user_id: "guest" };
  });

  const handleGuestSave = () => {
    if (!draft.full_name.trim()) {
      toast.error(t("fullName") + " is required");
      return;
    }
    if (!draft.phone.trim()) {
      toast.error(t("phoneNumber") + " is required");
      return;
    }
    const slugResult = validateSlug(draft.slug || draft.full_name);
    if (!slugResult.valid) {
      toast.error(slugValidationMessage(slugResult));
      return;
    }
    const slug = slugResult.slug;

    // Save pending guest draft to localStorage & sessionStorage
    const payload = JSON.stringify({ card: { ...draft, slug }, updatedAt: Date.now() });
    try {
      localStorage.setItem(GUEST_DRAFT_KEY, payload);
      sessionStorage.setItem(GUEST_DRAFT_KEY, payload);
    } catch {
      /* ignore storage errors */
    }

    toast.success("Card draft saved! Create an account to publish it.");
    void navigate({
      to: "/auth",
      search: { mode: "signup", claim_draft: true, redirect: "/dashboard" },
    });
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2 font-display text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("backToHome")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {t("guestSandbox")}
            </span>
            <button
              type="button"
              onClick={handleGuestSave}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("signUpAndPublish")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
          <h1 className="font-display text-xl font-bold">{t("designCardTitle")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("designCardDesc")}</p>
        </div>

        <CardEditor
          draft={draft}
          setDraft={setDraft}
          userId="guest"
          isNew={true}
          onSaved={handleGuestSave}
        />
      </div>
    </main>
  );
}
