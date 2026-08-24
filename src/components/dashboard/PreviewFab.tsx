import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Props = {
  targetId?: string;
};

export function PreviewFab({ targetId = "live-preview" }: Props) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(() => typeof window === "undefined");

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show FAB when target preview is not intersecting or mostly out of view
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.15,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const handleScrollToPreview = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      data-testid="preview-fab"
      onClick={handleScrollToPreview}
      aria-label={t("jumpToPreview")}
      className="fixed bottom-24 sm:bottom-8 end-4 sm:end-8 z-40 flex items-center gap-2 rounded-full border border-purple-500/30 bg-slate-900/90 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-purple-950/50 backdrop-blur-md transition-all hover:border-purple-500/60 hover:bg-slate-800 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      <Eye className="h-4 w-4 text-purple-400 shrink-0" />
      <span>{t("previewCard")}</span>
    </button>
  );
}
