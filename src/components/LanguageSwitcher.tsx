import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/90 p-1 backdrop-blur-md text-xs font-semibold shadow-sm ${className}`}
    >
      <Globe className="h-3.5 w-3.5 text-primary ml-1 rtl:mr-1 rtl:ml-0 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`px-2.5 py-1 rounded-full transition-all text-[11px] font-bold ${
          lang === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        aria-pressed={lang === "ar"}
        className={`px-2.5 py-1 rounded-full transition-all text-[11px] font-bold font-arabic ${
          lang === "ar"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        العربية
      </button>
    </div>
  );
}
