import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";

export function CardNotFound() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("cardNotExistTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("cardNotExistDesc")}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}

export function CardServiceError({ error }: { error?: { message?: string } }) {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("cardServiceErrorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || t("cardServiceErrorDesc")}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}
