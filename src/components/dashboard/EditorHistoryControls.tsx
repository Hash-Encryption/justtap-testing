import { Redo2, Undo2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function EditorHistoryControls({ canUndo, canRedo, onUndo, onRedo }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center space-x-1 rtl:space-x-reverse"
      role="group"
      aria-label="History"
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t("undo")}
        title={t("undo")}
        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={t("redo")}
        title={t("redo")}
        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
