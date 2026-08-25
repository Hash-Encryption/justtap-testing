import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Props = {
  id?: string;
  title: string;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  id,
  title,
  badge,
  icon,
  defaultOpen = true,
  collapsible = true,
  children,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const contentId = id ? `${id}-content` : undefined;

  return (
    <section
      id={id}
      data-testid={id ? `section-${id}` : "collapsible-section"}
      className={`justtap-glass rounded-3xl border border-slate-800 transition-all scroll-mt-48 sm:scroll-mt-36 ${className}`}
    >
      <div
        className={`flex items-center justify-between p-5 sm:p-6 select-none ${
          collapsible ? "cursor-pointer hover:bg-slate-800/30" : ""
        } ${isOpen ? "border-b border-slate-800/60" : ""}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-slate-400">{icon}</span>}
          <h3 className="font-display text-sm font-bold text-white tracking-wide">{title}</h3>
          {badge}
        </div>

        {collapsible && (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={contentId}
            aria-label={isOpen ? t("collapseSection") : t("expandSection")}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      <div id={contentId} className={`p-5 sm:p-6 space-y-4 ${isOpen ? "block" : "hidden"}`}>
        {children}
      </div>
    </section>
  );
}
