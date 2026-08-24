import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DESIGN_PRESET_PALETTES, type Card } from "@/lib/card";
import { startProTrial } from "@/lib/billing";
import type { Session } from "@supabase/supabase-js";

import { useTranslation } from "@/lib/i18n";

export type ProUpgradeSource =
  | "publish_attempt"
  | "custom_creator_header"
  | "preview_dock"
  | "pro_features"
  | "pro_features_save"
  | "pro_features_action"
  | "connections_save"
  | "connections_export";

export type ProUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: ProUpgradeSource;
  draft?: Partial<Card> | null;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
};

export function ProUpgradeDialogBody({
  source = "pro_features",
  draft,
  session,
  onTrialStarted,
  onClose,
}: {
  source?: ProUpgradeSource;
  draft?: Partial<Card> | null;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const isPublish = source === "publish_attempt";
  const isCreatorHeader = source === "custom_creator_header" || source === "preview_dock";
  const isProFeaturesSave = source === "pro_features_save";
  const isConnectionsSave = source === "connections_save";
  const isConnectionsExport = source === "connections_export";

  // Identify matching preset name if any
  const matchedPreset = draft
    ? DESIGN_PRESET_PALETTES.find(
        (p) =>
          p.bg_color.toLowerCase() === (draft.bg_color || "").toLowerCase() &&
          p.surface_color.toLowerCase() === (draft.surface_color || "").toLowerCase() &&
          p.accent_color.toLowerCase() === (draft.accent_color || "").toLowerCase() &&
          p.champagne_accent.toLowerCase() === (draft.champagne_accent || "").toLowerCase() &&
          p.text_color.toLowerCase() === (draft.text_color || "").toLowerCase(),
      )
    : null;

  const paletteName = matchedPreset?.name || "Custom Palette";

  async function handleTrialClick() {
    if (!session) {
      toast.error(t("signInToStartTrial"));
      return;
    }

    setLoading(true);
    const result = await startProTrial(session);
    setLoading(false);

    if (!result.ok) {
      const alreadyUsed =
        result.error.includes("already used") || result.error.includes("already on");
      toast.error(
        alreadyUsed
          ? t("trialAlreadyUsedError")
          : result.error,
      );
      return;
    }

    toast.success(t("trialActiveSuccess"));
    onTrialStarted?.(result.trialEndsAt);
    onClose?.();
  }

  return (
    <>
      <DialogHeader className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-purple-600 via-purple-700 to-amber-500 text-white shadow-lg shadow-purple-900/30">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2 className="font-display text-xl font-bold text-white">
          {isPublish
            ? t("upgradeDialogTitlePublish")
            : isCreatorHeader
              ? t("upgradeDialogTitleCreator")
              : isProFeaturesSave
                ? t("upgradeDialogTitleProSave")
                : isConnectionsSave
                  ? t("upgradeDialogTitleConnectionsSave")
                  : isConnectionsExport
                    ? t("upgradeDialogTitleConnectionsExport")
                    : t("upgradeDialogTitleDefault")}
        </h2>

        <p className="text-xs text-slate-400">
          {isPublish
            ? t("upgradeDialogDescPublish")
            : isCreatorHeader
              ? t("upgradeDialogDescCreator")
              : isProFeaturesSave
                ? t("upgradeDialogDescProSave")
                : isConnectionsSave
                  ? t("upgradeDialogDescConnectionsSave")
                  : isConnectionsExport
                    ? t("upgradeDialogDescConnectionsExport")
                    : t("upgradeDialogDescDefault")}
        </p>
      </DialogHeader>

      {/* Visual design summary if triggered from custom design publish/preview */}
      {isPublish && draft && (
        <div
          data-testid="design-summary"
          className="my-3 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left rtl:text-right"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("designSummaryTitle")}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {paletteName}
            </span>
          </div>

          {/* 5 Swatches */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
              <span
                className="h-5 w-5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: draft.bg_color || "#08080A" }}
                title={`Background: ${draft.bg_color || "#08080A"}`}
              />
              <span
                className="h-5 w-5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: draft.surface_color || "#121216" }}
                title={`Surface: ${draft.surface_color || "#121216"}`}
              />
              <span
                className="h-5 w-5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: draft.accent_color || "#6B21A8" }}
                title={`Accent: ${draft.accent_color || "#6B21A8"}`}
              />
              <span
                className="h-5 w-5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: draft.champagne_accent || "#E6D5AC" }}
                title={`Secondary: ${draft.champagne_accent || "#E6D5AC"}`}
              />
              <span
                className="h-5 w-5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: draft.text_color || "#FAFAFA" }}
                title={`Text: ${draft.text_color || "#FAFAFA"}`}
              />
            </div>
            <span className="text-[11px] text-slate-400">{t("fiveColorPalette")}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">{t("fontLabel")}</span>
              <span className="font-semibold">{draft.font_family || "Outfit"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{t("finishLabel")}</span>
              <span className="font-semibold capitalize">
                {(draft.surface_finish || "matte").replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Feature List if not publish attempt */}
      {!isPublish && (
        <div className="my-3 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left rtl:text-right text-xs text-slate-300">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {t("upgradeFeatureCustomCreator")}
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {t("upgradeFeatureVideo")}
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {t("upgradeFeaturePdfCalendly")}
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {t("upgradeFeatureRemoveBranding")}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          data-testid="upgrade-primary-cta"
          onClick={() => void handleTrialClick()}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-amber-500 text-sm font-bold text-white shadow-lg shadow-purple-700/30 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          <span>{loading ? t("startingTrialBtn") : t("start7DayTrialBtn")}</span>
        </button>

        <button
          type="button"
          data-testid="upgrade-secondary-cta"
          onClick={onClose}
          disabled={loading}
          className="h-10 w-full rounded-2xl text-xs font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-60"
        >
          {isPublish
            ? t("keepEditing")
            : isCreatorHeader
              ? t("continueDesigning")
              : isConnectionsSave || isConnectionsExport
                ? t("continueReviewing")
                : t("maybeLater")}
        </button>
      </div>
    </>
  );
}

export function ProUpgradeDialog({
  open,
  onOpenChange,
  source = "pro_features",
  draft,
  session,
  onTrialStarted,
}: ProUpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="pro-upgrade-dialog"
        className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-2xl sm:max-w-lg"
      >
        <ProUpgradeDialogBody
          source={source}
          draft={draft}
          session={session}
          onTrialStarted={onTrialStarted}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
