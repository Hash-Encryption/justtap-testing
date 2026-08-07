import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc, QrCode, BarChart3, Inbox, Languages, Palette } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustTap — White-label NFC Digital Business Cards" },
      {
        name: "description",
        content:
          "Launch a fully white-label digital business card platform for NFC cards: live editor, lead capture, analytics and QR codes.",
      },
      { property: "og:title", content: "JustTap — White-label NFC Digital Business Cards" },
      {
        property: "og:description",
        content: "One tap. Contact saved. Multi-tenant digital business cards for NFC.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();

  const features = [
    { Icon: Palette, title: t("feature1Title"), body: t("feature1Desc") },
    { Icon: Nfc, title: t("feature2Title"), body: t("feature2Desc") },
    { Icon: Inbox, title: t("feature3Title"), body: t("feature3Desc") },
    { Icon: BarChart3, title: t("feature4Title"), body: t("feature4Desc") },
    { Icon: QrCode, title: t("feature5Title"), body: t("feature5Desc") },
    { Icon: Languages, title: t("feature6Title"), body: t("feature6Desc") },
  ];

  return (
    <main className="min-h-screen grid-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">
          {t("appName")}
          <span className="text-primary">.</span>
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <LanguageSwitcher />
          <Link
            to="/auth"
            className="rounded-full px-3.5 py-2 font-medium text-muted-foreground hover:text-foreground"
          >
            {t("signIn")}
          </Link>
          <Link
            to="/builder"
            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("createCardFirst")}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-10 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Nfc className="h-3.5 w-3.5 text-primary" /> {t("badgeText")}
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {t("heroTitle")} <span className="text-primary">{t("heroTitleHighlight")}</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">{t("heroSubtitle")}</p>

        {/* 2 CLEAR CHOICES */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-md mx-auto">
          <Link
            to="/builder"
            className="glass flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-primary/50 bg-primary/10 p-5 text-center transition hover:scale-[1.02] hover:border-primary"
          >
            <span className="font-display text-base font-bold text-foreground">
              {t("choiceCreateTitle")}
            </span>
            <span className="text-xs text-muted-foreground">{t("choiceCreateDesc")}</span>
          </Link>

          <Link
            to="/auth"
            className="glass flex flex-col items-center justify-center gap-1 rounded-2xl border border-border p-5 text-center transition hover:scale-[1.02] hover:border-foreground/30"
          >
            <span className="font-display text-base font-bold text-foreground">
              {t("choiceLoginTitle")}
            </span>
            <span className="text-xs text-muted-foreground">{t("choiceLoginDesc")}</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ Icon, title, body }) => (
          <article key={title} className="glass rounded-2xl p-5">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
