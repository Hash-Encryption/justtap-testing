import { useTranslation } from "@/lib/i18n";
import { Sparkles, User, Palette, Phone, Globe, Sliders } from "lucide-react";

export type EditorSectionId = "profile" | "style" | "colors" | "contact" | "bilingual";

type Props = {
  activeSection: EditorSectionId;
  onSectionClick: (id: EditorSectionId) => void;
  showColorsTab?: boolean;
};

export function EditorSectionNav({ activeSection, onSectionClick, showColorsTab = true }: Props) {
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
    <nav
      data-testid="editor-section-nav"
      aria-label="Editor sections"
      className="sticky top-16 lg:top-20 z-20 justtap-glass rounded-2xl p-1.5 border border-slate-800 backdrop-blur-md mb-6"
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none ${
                isActive
                  ? "bg-purple-700 text-white font-bold shadow-md shadow-purple-700/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
