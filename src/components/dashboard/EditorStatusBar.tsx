import { Check, Eye, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Props = {
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  justPublished: boolean;
  isProPreview: boolean;
  isPublishedLive: boolean;
  lastAutoSaved: string | null;
};

export function EditorStatusBar({
  isDirty,
  isSaving,
  isPublishing,
  justPublished,
  isProPreview,
  isPublishedLive,
  lastAutoSaved,
}: Props) {
  const { t } = useTranslation();

  if (isPublishing) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-purple-300"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
        <span>{t("editorStatusPublishing")}</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-purple-300"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
        <span>{t("saving")}</span>
      </div>
    );
  }

  if (justPublished) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold text-emerald-400"
      >
        <Check className="w-3.5 h-3.5" />
        <span>{t("editorStatusPublished")}</span>
      </div>
    );
  }

  if (isProPreview) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-1.5 rtl:space-x-reverse"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
          <Eye className="w-3.5 h-3.5" />
          {t("editorStatusProPreview")}
        </span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-semibold text-amber-300"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span>
          {lastAutoSaved
            ? `${t("draftSavedLocally")} · ${t("changesNotPublished")}`
            : t("changesNotPublished")}
        </span>
      </div>
    );
  }

  if (isPublishedLive) {
    return (
      <div
        data-testid="editor-status-bar"
        className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-emerald-400"
      >
        <Check className="w-3.5 h-3.5" />
        <span>
          {t("saved")} · {t("editorStatusLiveCard")}
        </span>
      </div>
    );
  }

  // Saved locally / saved draft but not live
  return (
    <div
      data-testid="editor-status-bar"
      className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-slate-300"
    >
      <Check className="w-3.5 h-3.5 text-slate-400" />
      <span>{t("editorStatusSavedDraft")}</span>
    </div>
  );
}
