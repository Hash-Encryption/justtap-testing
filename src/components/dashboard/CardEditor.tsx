import { useEffect, useState, useRef, useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Check,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  PowerOff,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { getPaletteContrastWarnings } from "@/lib/card-design";
import {
  DESIGN_PRESET_PALETTES,
  FINISHES,
  FONT_OPTIONS,
  isValidHexColor,
  PATTERNS,
  RADIUS_OPTIONS,
  slugify,
  type BorderRadius,
  type Card,
  type DesignMode,
  type FontFamily,
  type HeaderPattern,
  type SurfaceFinish,
} from "@/lib/card";
import { CardPreview } from "@/components/card/CardPreview";
import { PhoneFrame } from "./PhoneFrame";
import { Dropzone } from "./Dropzone";
import { sanitizePhone, sanitizeText, sanitizeUrl } from "@/lib/sanitization";
import { slugValidationMessage, validateSlug } from "@/lib/slug";
import { saveCardRecord } from "@/lib/card-save";
import {
  canPersistCardDraft,
  clearCardDraft,
  getCardDraftId,
  getCardDraftKey,
  migrateLegacyCardDraft,
  readCardDraft,
  reconcileCardDraftAfterSave,
  recoverNewerCardDraft,
  writeCardDraft,
} from "@/lib/card-draft";
import { useTranslation } from "@/lib/i18n";

async function uploadDataUrlIfNeeded(
  dataUrl: string | null | undefined,
  userId: string,
  prefix: string,
): Promise<string | null> {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith("data:")) return dataUrl;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
    const ext = mime.split("/")[1] || "png";
    const path = `${userId}/${prefix}_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: mime, upsert: true, cacheControl: "3600" });

    if (!error) {
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
  } catch (err) {
    console.error("Failed to upload asset to storage:", err);
  }
  return dataUrl;
}

type Props = {
  draft: Card;
  setDraft: (c: Card) => void;
  userId: string;
  isNew: boolean;
  savedSlug?: string;
  publishedCard?: Card | null;
  onSaved: (c: Card) => void;
  onBackToDashboard?: () => void;
};

export function CardEditor({
  draft,
  setDraft,
  userId,
  isNew,
  savedSlug,
  publishedCard,
  onSaved,
  onBackToDashboard,
}: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showArabic, setShowArabic] = useState(draft.enable_arabic);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(null);

  // Dual-mode memory state preservation
  const [customDraftState, setCustomDraftState] = useState<Partial<Card>>({
    header_pattern: draft.header_pattern || "wave",
    bg_color: draft.bg_color || "#08080A",
    surface_color: draft.surface_color || "#121216",
    accent_color: draft.accent_color || "#6B21A8",
    champagne_accent: draft.champagne_accent || "#E6D5AC",
    text_color: draft.text_color || "#FAFAFA",
    surface_finish: draft.surface_finish || "matte",
    border_radius: draft.border_radius || "minimal",
    font_family: draft.font_family || "Outfit",
  });

  const isPro = draft.plan_tier === "pro" || draft.plan_tier === "enterprise";

  const isDirty = useMemo(() => {
    if (!publishedCard) return true;
    return JSON.stringify(draft) !== JSON.stringify(publishedCard);
  }, [draft, publishedCard]);

  const draftCardId = getCardDraftId(userId, draft);
  const draftKey = getCardDraftKey(userId, draftCardId);
  const currentDraftRef = useRef(draft);
  const memoryUpdatedAtRef = useRef(0);
  const hydratedKeyRef = useRef<string | null>(null);
  const dirtyRef = useRef(isDirty);
  const skipFlushRef = useRef(false);
  const activeIdentityRef = useRef({ userId, cardId: draftCardId, key: draftKey });
  currentDraftRef.current = draft;
  dirtyRef.current = isDirty;
  activeIdentityRef.current = { userId, cardId: draftCardId, key: draftKey };

  // Hydrate the exact user/card draft before persistence is enabled.
  useEffect(() => {
    setHydratedDraftKey(null);
    hydratedKeyRef.current = null;
    memoryUpdatedAtRef.current = 0;
    skipFlushRef.current = false;

    try {
      const stored =
        readCardDraft(window.localStorage, userId, draftCardId) ??
        migrateLegacyCardDraft(window.localStorage, userId, currentDraftRef.current);
      const recovery = recoverNewerCardDraft(currentDraftRef.current, 0, stored);
      if (recovery.restored) {
        currentDraftRef.current = recovery.card;
        memoryUpdatedAtRef.current = recovery.updatedAt;
        setDraft(recovery.card);
        setShowArabic(recovery.card.enable_arabic);
        setDraftRestored(true);
        toast.info("Restored your active draft");
      } else {
        setDraftRestored(false);
      }
    } catch {
      /* ignore */
    }
    hydratedKeyRef.current = draftKey;
    setHydratedDraftKey(draftKey);
  }, [draftCardId, draftKey, setDraft, userId]);

  // Debounced local recovery write. The hydration guard prevents startup clobbering.
  useEffect(() => {
    if (!canPersistCardDraft(hydratedDraftKey, draftKey, isDirty)) return;

    const timeout = window.setTimeout(() => {
      try {
        const stored = writeCardDraft(window.localStorage, userId, currentDraftRef.current);
        memoryUpdatedAtRef.current = stored.updatedAt;
        setLastAutoSaved(
          new Date(stored.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {
        /* ignore */
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, draftKey, hydratedDraftKey, isDirty, userId]);

  // Flush on background/unmount and reconcile only when browser storage is newer.
  useEffect(() => {
    const persistNow = () => {
      if (!canPersistCardDraft(hydratedKeyRef.current, draftKey, dirtyRef.current)) return;
      try {
        const stored = writeCardDraft(window.localStorage, userId, currentDraftRef.current);
        memoryUpdatedAtRef.current = stored.updatedAt;
        setLastAutoSaved(
          new Date(stored.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {
        /* ignore */
      }
    };

    const reconcile = () => {
      try {
        const stored = readCardDraft(window.localStorage, userId, draftCardId);
        const recovery = recoverNewerCardDraft(
          currentDraftRef.current,
          memoryUpdatedAtRef.current,
          stored,
        );
        if (!recovery.restored) return;
        currentDraftRef.current = recovery.card;
        memoryUpdatedAtRef.current = recovery.updatedAt;
        setDraft(recovery.card);
        setShowArabic(recovery.card.enable_arabic);
        setDraftRestored(true);
        toast.info("Restored your active draft");
      } catch {
        /* ignore */
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistNow();
      else reconcile();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", reconcile);
    window.addEventListener("pageshow", reconcile);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("pageshow", reconcile);
    };
  }, [draftCardId, draftKey, setDraft, userId]);

  useEffect(
    () => () => {
      if (skipFlushRef.current || !dirtyRef.current) return;
      const identity = activeIdentityRef.current;
      if (hydratedKeyRef.current !== identity.key) return;
      try {
        writeCardDraft(window.localStorage, identity.userId, currentDraftRef.current);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const updateDraft = (next: Card) => {
    memoryUpdatedAtRef.current = Date.now();
    currentDraftRef.current = next;
    skipFlushRef.current = false;
    setLastAutoSaved(null);
    setDraft(next);
  };

  const set = <K extends keyof Card>(key: K, value: Card[K]) =>
    updateDraft({ ...draft, [key]: value });
  const setSocial = (key: string, value: string) =>
    updateDraft({ ...draft, social_links: { ...(draft.social_links ?? {}), [key]: value } });

  // Mode switcher handler with working draft state preservation
  const handleModeSwitch = (mode: DesignMode) => {
    if (mode === "custom" && !isPro) {
      toast.error("Custom Creator is a PRO feature. Upgrade to unlock full custom design!");
      return;
    }

    if (mode === "classic_v2") {
      // Save current custom settings into customDraftState memory before switching to Classic
      setCustomDraftState({
        header_pattern: draft.header_pattern,
        bg_color: draft.bg_color,
        surface_color: draft.surface_color,
        accent_color: draft.accent_color,
        champagne_accent: draft.champagne_accent,
        text_color: draft.text_color,
        surface_finish: draft.surface_finish,
        border_radius: draft.border_radius,
        font_family: draft.font_family,
      });

      // Reset card preview props to Classic V2 standard
      updateDraft({
        ...draft,
        design_mode: "classic_v2",
        header_pattern: "wave",
        bg_color: "#08080A",
        surface_color: "#121216",
        accent_color: "#6B21A8",
        champagne_accent: "#E6D5AC",
        text_color: "#FAFAFA",
        surface_finish: "matte",
        border_radius: "minimal",
        font_family: "Outfit",
      });
    } else {
      // Switch to Custom Creator, restoring saved custom working state
      updateDraft({
        ...draft,
        design_mode: "custom",
        header_pattern: customDraftState.header_pattern || "wave",
        bg_color: customDraftState.bg_color || "#08080A",
        surface_color: customDraftState.surface_color || "#121216",
        accent_color: customDraftState.accent_color || "#6B21A8",
        champagne_accent: customDraftState.champagne_accent || "#E6D5AC",
        text_color: customDraftState.text_color || "#FAFAFA",
        surface_finish: customDraftState.surface_finish || "matte",
        border_radius: customDraftState.border_radius || "minimal",
        font_family: customDraftState.font_family || "Outfit",
      });
    }
  };

  const applyPreset = (presetId: string) => {
    if (!isPro) {
      toast.error("Preset Palettes require a Pro subscription");
      return;
    }
    const preset = DESIGN_PRESET_PALETTES.find((p) => p.id === presetId);
    if (!preset) return;

    updateDraft({
      ...draft,
      design_mode: "custom",
      bg_color: preset.bg_color,
      surface_color: preset.surface_color,
      accent_color: preset.accent_color,
      champagne_accent: preset.champagne_accent,
      text_color: preset.text_color,
    });
  };

  // Safe Deactivate / Unpublish Public Card function
  const handleToggleDeactivate = async () => {
    if (!draft.id || isNew) return;
    setDeactivating(true);

    const newActiveState = !(draft.is_active ?? true);
    const { data, error } = await supabase
      .from("cards")
      .update({ is_active: newActiveState })
      .eq("id", draft.id)
      .eq("user_id", userId)
      .select()
      .single();

    setDeactivating(false);
    setShowDeactivateModal(false);

    if (error || !data) {
      toast.error("Failed to update card public status.");
      return;
    }

    const updated = data as Card;
    skipFlushRef.current = true;
    reconcileCardDraftAfterSave(window.localStorage, userId, draftCardId, true);
    setLastAutoSaved(null);
    setDraft(updated);
    onSaved(updated);
    toast.success(
      newActiveState
        ? "Public card activated!"
        : "Public card disabled. Permanent /t/:token links remain protected.",
    );
  };

  async function publishChanges(): Promise<void> {
    if (!draft.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!draft.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    // Validate 5 color controls against 6-digit hex format
    const colorsToValidate = [
      { name: "Background", val: draft.bg_color || "#08080A" },
      { name: "Surface", val: draft.surface_color || "#121216" },
      { name: "Primary Accent", val: draft.accent_color || "#6B21A8" },
      { name: "Champagne Accent", val: draft.champagne_accent || "#E6D5AC" },
      { name: "Text Color", val: draft.text_color || "#FAFAFA" },
    ];

    for (const c of colorsToValidate) {
      if (!isValidHexColor(c.val)) {
        toast.error(`Invalid ${c.name} color format. Please use 6-digit hex (e.g. #6B21A8)`);
        return;
      }
    }

    const slugResult = validateSlug(draft.slug || draft.full_name);
    if (!slugResult.valid) {
      toast.error(slugValidationMessage(slugResult));
      return;
    }
    const slug = slugResult.slug;

    if (userId === "guest") {
      try {
        writeCardDraft(window.localStorage, userId, { ...draft, slug });
      } catch {
        /* ignore */
      }
      onSaved({ ...draft, slug });
      return;
    }

    setSaving(true);
    const avatar_url = await uploadDataUrlIfNeeded(draft.avatar_url, userId, "avatar");
    const logo_url = await uploadDataUrlIfNeeded(draft.logo_url, userId, "logo");

    const sanitizedSocialLinks = {
      linkedin: sanitizeUrl(draft.social_links?.linkedin) || "",
      instagram: sanitizeUrl(draft.social_links?.instagram) || "",
      twitter: sanitizeUrl(draft.social_links?.twitter) || "",
      website: sanitizeUrl(draft.social_links?.website) || "",
    };

    const payload = {
      user_id: userId,
      slug,
      full_name: sanitizeText(draft.full_name, 100),
      phone: sanitizePhone(draft.phone),
      email: draft.email ? sanitizeText(draft.email, 100) : null,
      title: draft.title ? sanitizeText(draft.title, 100) : null,
      company: draft.company ? sanitizeText(draft.company, 100) : null,
      bio: draft.bio ? sanitizeText(draft.bio, 1000) : null,
      avatar_url: avatar_url ? sanitizeUrl(avatar_url) : null,
      logo_url: logo_url ? sanitizeUrl(logo_url) : null,
      show_logo_badge: draft.show_logo_badge,
      design_mode: draft.design_mode || "classic_v2",
      header_pattern: draft.header_pattern || "wave",
      accent_color: draft.accent_color || "#6B21A8",
      bg_color: draft.bg_color || "#08080A",
      surface_color: draft.surface_color || "#121216",
      champagne_accent: draft.champagne_accent || "#E6D5AC",
      text_color: draft.text_color || "#FAFAFA",
      surface_finish: draft.surface_finish || "matte",
      border_radius: draft.border_radius || "minimal",
      font_family: draft.font_family || "Outfit",
      whatsapp_phone: draft.whatsapp_phone ? sanitizePhone(draft.whatsapp_phone) : null,
      whatsapp_message: draft.whatsapp_message ? sanitizeText(draft.whatsapp_message, 250) : null,
      enable_arabic: draft.enable_arabic,
      full_name_ar: draft.full_name_ar ? sanitizeText(draft.full_name_ar, 100) : null,
      title_ar: draft.title_ar ? sanitizeText(draft.title_ar, 100) : null,
      bio_ar: draft.bio_ar ? sanitizeText(draft.bio_ar, 1000) : null,
      social_links: sanitizedSocialLinks,
      pro_features: draft.pro_features ?? {},
    };

    if (!isNew && !draft.id) {
      setSaving(false);
      toast.error("This card cannot be updated because its identifier is missing.");
      return;
    }

    const result = await saveCardRecord<Card>(
      { isNew, cardId: draft.id, userId, payload },
      {
        async insert(cardPayload) {
          const { data, error } = await supabase
            .from("cards")
            .insert(cardPayload)
            .select()
            .single();
          return { data: data as Card | null, error };
        },
        async update(cardId, ownerId, cardPayload) {
          const { data, error } = await supabase
            .from("cards")
            .update(cardPayload)
            .eq("id", cardId)
            .eq("user_id", ownerId)
            .select()
            .single();
          return { data: data as Card | null, error };
        },
      },
      (error) => console.error("[card-editor] Save failed", error),
    );

    setSaving(false);
    try {
      reconcileCardDraftAfterSave(
        window.localStorage,
        userId,
        draftCardId,
        result.status === "saved",
      );
    } catch {
      /* ignore */
    }
    if (result.status !== "saved") {
      toast.error(
        result.status === "duplicate_slug"
          ? "This URL is already taken."
          : result.status === "invalid_slug"
            ? "The card URL is invalid."
            : "We couldn't save your card. Please try again.",
      );
      return;
    }

    skipFlushRef.current = true;
    setLastAutoSaved(null);
    toast.success(isNew ? "Card published live!" : "Published changes live!");
    onSaved(result.card);
  }

  if (hydratedDraftKey !== draftKey) {
    return (
      <div
        className="grid min-h-64 place-items-center"
        role="status"
        aria-label="Loading card draft"
      >
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="relative pb-24 space-y-6">
      {/* TOP EDITOR BAR */}
      <div className="justtap-glass rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cards</span>
            </button>
          )}

          {/* Sync Status Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="text-xs font-semibold text-slate-300">
              {isDirty ? (lastAutoSaved ? "Draft saved locally" : "Unsaved Changes") : "Saved"}
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
          {!isNew && draft.id && (
            <button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              className="px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>
                {(draft.is_active ?? true) ? "Disable Public Profile" : "Enable Public Profile"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void publishChanges()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-700/30 flex items-center space-x-2 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Publish Changes</span>
          </button>
        </div>
      </div>

      {draftRestored && (
        <div className="flex items-center justify-between rounded-xl bg-purple-950/40 border border-purple-800/40 px-4 py-2.5 text-xs text-purple-200">
          <span>Loaded your working draft from browser storage.</span>
          <button
            type="button"
            onClick={() => {
              try {
                clearCardDraft(window.localStorage, userId, draftCardId);
              } catch {
                /* ignore */
              }
              setLastAutoSaved(null);
              setDraftRestored(false);
            }}
            className="underline opacity-80 hover:opacity-100"
          >
            Clear draft
          </button>
        </div>
      )}

      {/* WORKBENCH LAYOUT: Desktop Split / Mobile Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Sticky Realistic Phone Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div id="live-preview" className="scroll-mt-24">
            <PhoneFrame>
              <CardPreview card={draft} />
            </PhoneFrame>
          </div>

          {/* MODE SWITCHER: Placed directly below phone preview */}
          <div className="justtap-glass rounded-2xl p-2 flex items-center justify-between border border-slate-800 max-w-[340px] mx-auto">
            <button
              type="button"
              onClick={() => handleModeSwitch("classic_v2")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                draft.design_mode !== "custom"
                  ? "bg-purple-700 text-white shadow-md shadow-purple-700/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Classic V2</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch("custom")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                draft.design_mode === "custom"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Custom Creator</span>
              {!isPro && <Lock className="w-3 h-3 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Editors & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* CUSTOM CREATOR ENGINE CONTROLS */}
          {draft.design_mode === "custom" && (
            <div className="justtap-glass rounded-3xl p-6 space-y-6 border border-amber-500/20 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white font-display">
                    Custom Creator Engine
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  PRO ONLY
                </span>
              </div>

              {/* 1. PRESET PALETTES */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">Preset Palettes</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {DESIGN_PRESET_PALETTES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all space-y-1.5"
                    >
                      <span className="text-xs font-bold text-white block">{preset.name}</span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-white/25 shadow-xs"
                          style={{ backgroundColor: preset.bg_color }}
                          title={`Background: ${preset.bg_color}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/25 shadow-xs"
                          style={{ backgroundColor: preset.surface_color }}
                          title={`Surface: ${preset.surface_color}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/25 shadow-xs"
                          style={{ backgroundColor: preset.accent_color }}
                          title={`Primary Accent: ${preset.accent_color}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/25 shadow-xs"
                          style={{ backgroundColor: preset.champagne_accent }}
                          title={`Secondary Accent: ${preset.champagne_accent}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/25 shadow-xs"
                          style={{ backgroundColor: preset.text_color }}
                          title={`Text: ${preset.text_color}`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. HEADER DIVIDER PATTERNS */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Header Divider Pattern
                </span>
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => set("header_pattern", p.value as HeaderPattern)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        draft.header_pattern === p.value
                          ? "border-amber-400 bg-amber-400/10 text-amber-300"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. SURFACE FINISHES */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">Surface Finish</span>
                <div className="grid grid-cols-2 gap-2">
                  {FINISHES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => set("surface_finish", f.value as SurfaceFinish)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        draft.surface_finish === f.value
                          ? "border-amber-400 bg-amber-400/10 text-amber-300"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. FIVE CUSTOM COLOR CONTROLS */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Five Color Controls
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <ColorPickerField
                    label="1. Background"
                    value={draft.bg_color || "#08080A"}
                    onChange={(v) => set("bg_color", v)}
                  />
                  <ColorPickerField
                    label="2. Surface"
                    value={draft.surface_color || "#121216"}
                    onChange={(v) => set("surface_color", v)}
                  />
                  <ColorPickerField
                    label="3. Primary Accent"
                    value={draft.accent_color || "#6B21A8"}
                    onChange={(v) => set("accent_color", v)}
                  />
                  <ColorPickerField
                    label="4. Champagne Accent"
                    value={draft.champagne_accent || "#E6D5AC"}
                    onChange={(v) => set("champagne_accent", v)}
                  />
                  <ColorPickerField
                    label="5. Text Color"
                    value={draft.text_color || "#FAFAFA"}
                    onChange={(v) => set("text_color", v)}
                  />
                </div>

                {/* Inline Contrast Quality Notice */}
                {(() => {
                  const contrastWarnings = getPaletteContrastWarnings({
                    textColor: draft.text_color,
                    bgColor: draft.bg_color,
                    surfaceColor: draft.surface_color,
                    accentColor: draft.accent_color,
                    champagneAccent: draft.champagne_accent,
                    surfaceFinish: draft.surface_finish,
                  });
                  if (contrastWarnings.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 text-xs text-amber-200">
                      <div className="flex items-center space-x-1.5 font-semibold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Contrast Notice</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 pl-1">
                        {contrastWarnings.map((w, idx) => (
                          <li key={idx}>{w.message}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>

              {/* 5. CORNER STYLE & FONT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">Corner Style</span>
                  <div className="flex gap-1.5">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => set("border_radius", r.value as BorderRadius)}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all ${
                          draft.border_radius === r.value
                            ? "border-amber-400 bg-amber-400/10 text-amber-300"
                            : "border-slate-800 bg-slate-900/60 text-slate-400"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">Card Font</span>
                  <div className="flex gap-1.5">
                    {FONT_OPTIONS.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => set("font_family", font.value as FontFamily)}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-xl border truncate transition-all ${
                          draft.font_family === font.value
                            ? "border-amber-400 bg-amber-400/10 text-amber-300"
                            : "border-slate-800 bg-slate-900/60 text-slate-400"
                        }`}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STANDARD CARD EDIT FORM SECTIONS */}
          <Section title={t("personalInfo")}>
            <Input
              label={t("fullName")}
              value={draft.full_name}
              onChange={(v) => set("full_name", v)}
            />
            <Input
              label={t("cardLink")}
              value={draft.slug}
              onChange={(v) => set("slug", slugify(v))}
              hint={`/c/${slugify(draft.slug || draft.full_name) || "your-name"}`}
            />
            <Input
              label={t("jobTitle")}
              value={draft.title ?? ""}
              onChange={(v) => set("title", v)}
            />
            <Input
              label={t("company")}
              value={draft.company ?? ""}
              onChange={(v) => set("company", v)}
            />
            <Input
              label={t("bio")}
              value={draft.bio ?? ""}
              onChange={(v) => set("bio", v)}
              textarea
            />
          </Section>

          <Section title={t("photosMedia")}>
            <Dropzone
              label={t("profilePhoto")}
              value={draft.avatar_url}
              userId={userId}
              onChange={(url) => set("avatar_url", url)}
            />
            <Dropzone
              label={t("logoBadge")}
              value={draft.logo_url}
              userId={userId}
              round
              onChange={(url) => set("logo_url", url)}
            />
          </Section>

          <Section title={t("contactDetails")}>
            <Input label={t("phoneNumber")} value={draft.phone} onChange={(v) => set("phone", v)} />
            <Input
              label={t("whatsappNumber")}
              value={draft.whatsapp_phone ?? ""}
              onChange={(v) => set("whatsapp_phone", v)}
              hint="Auto-formats local numbers (e.g. 0501234567 -> 966501234567)"
            />
            <Input
              label={t("whatsappMessage")}
              value={draft.whatsapp_message ?? ""}
              onChange={(v) => set("whatsapp_message", v)}
            />
            <Input
              label={t("emailAddress")}
              value={draft.email ?? ""}
              onChange={(v) => set("email", v)}
            />
          </Section>

          <Section title={t("socialLinks")}>
            <Input
              label="LinkedIn"
              value={draft.social_links?.linkedin ?? ""}
              onChange={(v) => setSocial("linkedin", v)}
            />
            <Input
              label="Instagram"
              value={draft.social_links?.instagram ?? ""}
              onChange={(v) => setSocial("instagram", v)}
            />
            <Input
              label="X / Twitter"
              value={draft.social_links?.twitter ?? ""}
              onChange={(v) => setSocial("twitter", v)}
            />
            <Input
              label="Website"
              value={draft.social_links?.website ?? ""}
              onChange={(v) => setSocial("website", v)}
            />
          </Section>

          <Section title={t("bilingualArabic")}>
            <label className="flex items-center gap-2.5 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.enable_arabic}
                onChange={(e) => {
                  set("enable_arabic", e.target.checked);
                  setShowArabic(e.target.checked);
                }}
                className="h-4 w-4 accent-purple-600"
              />
              {t("enableArabicSwitch")}
            </label>
            {showArabic && (
              <div className="space-y-4 pt-2" dir="rtl">
                <Input
                  label={t("arFullName")}
                  value={draft.full_name_ar ?? ""}
                  onChange={(v) => set("full_name_ar", v)}
                />
                <Input
                  label={t("arJobTitle")}
                  value={draft.title_ar ?? ""}
                  onChange={(v) => set("title_ar", v)}
                />
                <Input
                  label={t("arBio")}
                  value={draft.bio_ar ?? ""}
                  onChange={(v) => set("bio_ar", v)}
                  textarea
                />
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR DEACTIVATING PUBLIC CARD */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <PowerOff className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                {(draft.is_active ?? true) ? "Disable Public Profile?" : "Enable Public Profile?"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {(draft.is_active ?? true)
                  ? "This will turn your public profile (/c/" +
                    draft.slug +
                    ") into a 404 inactive page. Note: Your physical permanent token (/t/:token) identity will remain completely safe and protected."
                  : "This will reactivate your public profile URL (/c/" + draft.slug + ")."}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleToggleDeactivate()}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5"
              >
                {deactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="justtap-glass space-y-4 rounded-3xl p-6 border border-slate-800">
      <h3 className="font-display text-sm font-bold text-white">{title}</h3>
      {children}
    </section>
  );
}

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
        />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  hint,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-purple-500"
        />
      )}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
