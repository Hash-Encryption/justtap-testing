import { useTranslation } from "@/lib/i18n";
import { Sparkles, User, Palette, Phone, Globe, Sliders } from "lucide-react";

export type EditorSectionId = "profile" | "style" | "colors" | "contact" | "bilingual";

type Props = {
  activeSection: EditorSectionId;
  onSectionClick: (id: EditorSectionId) => void;
  showColorsTab?: boolean;
  className?: string;
};

export function EditorSectionNav({
  activeSection,
  onSectionClick,
  showColorsTab = true,
  className = "",
}: Props) {
  const { t } = useTranslation();

  const sections: Array<{ id: EditorSectionId; label: string; icon: typeof User }> = [
    { id: "profile", label: t("sectionNavProfile"), icon: User },
    { id: "style", label: t("sectionNavStyle"), icon: Sliders },
    ...(showColorsTab
      ? [{ id: "colors" as EditorSectionId, label: t("sectionNavColors"), icon: Palette }]
      : []),
    { id: "contact", label: t("sectionNavContact"), icon: Phone },
    { id: "bilingual", label: t("sectionNavBilingual"), icon: Globe },
  ];

  return (
    <div
      data-testid="editor-section-nav-wrapper"
      className={`sticky top-20 sm:top-24 z-30 flex justify-center w-full pointer-events-none py-1 ${className}`}
    >
      <nav
        data-testid="editor-section-nav"
        aria-label="Editor sections"
        className="pointer-events-auto w-fit max-w-full rounded-full border border-slate-800/90 bg-slate-950/85 p-1.5 shadow-2xl shadow-purple-950/40 backdrop-blur-xl"
      >
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                data-section-id={sec.id}
                onClick={() => onSectionClick(sec.id)}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none ${
                  isActive
                    ? "bg-purple-700 text-white font-bold shadow-md shadow-purple-700/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 active:scale-95"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
