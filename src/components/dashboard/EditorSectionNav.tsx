import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { User, Palette, Phone, Globe, Sliders } from "lucide-react";

export type EditorSectionId = "profile" | "style" | "colors" | "contact" | "bilingual";

type Props = {
  activeSection: EditorSectionId;
  onSectionClick: (id: EditorSectionId) => void;
  showColorsTab?: boolean;
  topOffset?: number;
  className?: string;
};

export function EditorSectionNav({
  activeSection,
  onSectionClick,
  showColorsTab = true,
  topOffset,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const navScrollRef = useRef<HTMLDivElement>(null);

  const sections: Array<{ id: EditorSectionId; label: string; icon: typeof User }> = [
    { id: "profile", label: t("sectionNavProfile"), icon: User },
    { id: "style", label: t("sectionNavStyle"), icon: Sliders },
    ...(showColorsTab
      ? [{ id: "colors" as EditorSectionId, label: t("sectionNavColors"), icon: Palette }]
      : []),
    { id: "contact", label: t("sectionNavContact"), icon: Phone },
    { id: "bilingual", label: t("sectionNavBilingual"), icon: Globe },
  ];

  // Keep active section tab visible inside the horizontal capsule on small screens
  useEffect(() => {
    if (!navScrollRef.current) return;
    const activeBtn = navScrollRef.current.querySelector<HTMLElement>(
      `[data-section-id="${activeSection}"]`,
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeSection]);

  const styleTop = topOffset !== undefined ? `${topOffset}px` : undefined;

  return (
    <div
      data-testid="editor-section-nav-wrapper"
      style={styleTop ? { top: styleTop } : undefined}
      className={`fixed left-0 right-0 z-30 flex justify-center w-full pointer-events-none px-4 transition-[top] duration-150 ${
        topOffset === undefined ? "top-[140px] sm:top-[88px]" : ""
      } ${className}`}
    >
      <nav
        data-testid="editor-section-nav"
        aria-label="Editor sections"
        className="pointer-events-auto w-fit max-w-full rounded-full border border-slate-800/90 bg-slate-950/85 p-1.5 shadow-2xl shadow-purple-950/40 backdrop-blur-xl"
      >
        <div
          ref={navScrollRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-1"
        >
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
