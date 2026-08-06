import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, toggleLang } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLang}
      className={`flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition hover:border-primary hover:bg-secondary ${className}`}
      title={lang === "en" ? "التحويل إلى العربية" : "Switch to English"}
    >
      <Globe className="h-3.5 w-3.5 text-primary" />
      <span>{lang === "en" ? "العربية" : "EN"}</span>
    </button>
  );
}
