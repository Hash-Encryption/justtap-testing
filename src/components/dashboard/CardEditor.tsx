import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  PowerOff,
  Save,
  Sparkles,
  User,
  Sliders,
  Palette,
  Phone,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { getPaletteContrastWarnings, isProEntitled } from "@/lib/card-design";
import {
  DESIGN_PRESET_PALETTES,
  FINISHES,
  FONT_OPTIONS,
  isCardProfileComplete,
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
import { trackCardEditStarted, trackProfileCompleted } from "@/lib/product-events";
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
import { getEditorLanguageConfig } from "@/lib/editor-language";
import { ProUpgradeDialog, type ProUpgradeSource } from "./ProUpgradeDialog";
import { PreviewFab } from "./PreviewFab";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorHistoryControls } from "./EditorHistoryControls";
import { EditorSectionNav, type EditorSectionId } from "./EditorSectionNav";
import { CollapsibleSection } from "./CollapsibleSection";
import { useEditorHistory, type CardVisualState } from "@/hooks/useEditorHistory";
import type { Session } from "@supabase/supabase-js";

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
  session?: Session | null;
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
  session,
  isNew,
  savedSlug,
  publishedCard,
  onSaved,
  onBackToDashboard,
}: Props) {
  const { lang, t } = useTranslation();
  const langConfig = useMemo(() => getEditorLanguageConfig(lang), [lang]);
  const [saving, setSaving] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showArabic, setShowArabic] = useState(draft.enable_arabic);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const draftCardId = getCardDraftId(userId, draft);
  const draftKey = getCardDraftKey(userId, draftCardId);
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return draftKey;
    return null;
  });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState<ProUpgradeSource>("publish_attempt");
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSectionId>("profile");

  const presetFeedbackTimerRef = useRef<number | null>(null);
  const justPublishedTimerRef = useRef<number | null>(null);

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

  const isPro = isProEntitled(draft);

  const isDirty = useMemo(() => {
    if (!publishedCard) return true;
    return JSON.stringify(draft) !== JSON.stringify(publishedCard);
  }, [draft, publishedCard]);

  const currentDraftRef = useRef(draft);
  const memoryUpdatedAtRef = useRef(0);
  const hydratedKeyRef = useRef<string | null>(null);
  const dirtyRef = useRef(isDirty);
  const skipFlushRef = useRef(false);
  const activeIdentityRef = useRef({ userId, cardId: draftCardId, key: draftKey });
  currentDraftRef.current = draft;
  dirtyRef.current = isDirty;
  activeIdentityRef.current = { userId, cardId: draftCardId, key: draftKey };

  // Conservative Undo / Redo history layer
  const applyVisualHistoryState = useCallback(
    (visual: CardVisualState) => {
      const updated = {
        ...currentDraftRef.current,
        ...visual,
      };
      memoryUpdatedAtRef.current = Date.now();
      currentDraftRef.current = updated;
      skipFlushRef.current = false;
      setLastAutoSaved(null);
      setDraft(updated);
    },
    [setDraft],
  );

  const { canUndo, canRedo, undo, redo, pushState } = useEditorHistory(
    draft,
    applyVisualHistoryState,
  );

  // Keyboard shortcut listener for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const hasTrackedEditStartedRef = useRef(false);
  const lastPersistedCardRef = useRef<Card | null>(publishedCard ?? null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (publishedCard) {
      lastPersistedCardRef.current = publishedCard;
    }
  }, [publishedCard]);

  useEffect(() => {
    if (!hasTrackedEditStartedRef.current) {
      hasTrackedEditStartedRef.current = true;
      void trackCardEditStarted(draft.id, draft.is_active);
    }
  }, [draft.id, draft.is_active]);

  const isUserClickingRef = useRef(false);
  const userClickTimerRef = useRef<number | null>(null);

  // Section observer for scroll-spy section navigation
  useEffect(() => {
    const sectionIds: EditorSectionId[] = [
      "profile",
      "style",
      ...(draft.design_mode === "custom" ? ["colors" as EditorSectionId] : []),
      "contact",
      "bilingual",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        if (isUserClickingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "") as EditorSectionId;
            if (sectionIds.includes(id)) {
              setActiveSection(id);
            }
          }
        }
      },
      {
        rootMargin: "-25% 0px -65% 0px",
        threshold: 0,
      },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [draft.design_mode]);

  const handleSectionClick = (id: EditorSectionId) => {
    setActiveSection(id);
    isUserClickingRef.current = true;
    if (userClickTimerRef.current) window.clearTimeout(userClickTimerRef.current);
    userClickTimerRef.current = window.setTimeout(() => {
      isUserClickingRef.current = false;
    }, 800);

    const el = document.getElementById(`section-${id}`);
    if (el) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const elRect = el.getBoundingClientRect();
      const currentScrollY =
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

      const navEl = document.querySelector<HTMLElement>('[data-testid="editor-section-nav"]');
      const navHeight = navEl ? navEl.getBoundingClientRect().height : 44;
      const navRect = navEl?.getBoundingClientRect();
      const clearance = Math.max(navHeight + 16, (navRect?.bottom || 0) + 16);

      const scrollParent = el.closest(
        ".overflow-y-auto, [style*='overflow-y: auto']",
      ) as HTMLElement | null;

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const targetScrollTop = scrollParent.scrollTop + (elRect.top - parentRect.top) - clearance;
        scrollParent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      } else {
        const targetScrollY = currentScrollY + elRect.top - clearance;
        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }
    }
  };

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
      if (presetFeedbackTimerRef.current) window.clearTimeout(presetFeedbackTimerRef.current);
      if (justPublishedTimerRef.current) window.clearTimeout(justPublishedTimerRef.current);
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
    pushState(next);
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

  const isPresetSelected = (preset: (typeof DESIGN_PRESET_PALETTES)[number]) => {
    return (
      draft.design_mode === "custom" &&
      draft.bg_color === preset.bg_color &&
      draft.surface_color === preset.surface_color &&
      draft.accent_color === preset.accent_color &&
      draft.champagne_accent === preset.champagne_accent &&
      draft.text_color === preset.text_color
    );
  };

  const applyPreset = (presetId: string) => {
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

    setPresetFeedback(t("appliedToPreview"));
    if (presetFeedbackTimerRef.current) {
      window.clearTimeout(presetFeedbackTimerRef.current);
    }
    presetFeedbackTimerRef.current = window.setTimeout(() => {
      setPresetFeedback(null);
    }, 1800);
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

  async function publishChanges(draftOverride?: typeof draft): Promise<void> {
    if (isSavingRef.current || saving) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      const d = draftOverride ?? draft;
      const primaryNameKey = langConfig.primary.fields.fullName;
      const primaryName = d[primaryNameKey];
      if (!primaryName?.trim()) {
        toast.error(t("fullNameRequired"));
        return;
      }
      if (!d.phone.trim()) {
        toast.error("Phone number is required");
        return;
      }

      // Validate 5 color controls against 6-digit hex format
      const colorsToValidate = [
        { name: "Background", val: d.bg_color || "#08080A" },
        { name: "Surface", val: d.surface_color || "#121216" },
        { name: "Primary Accent", val: d.accent_color || "#6B21A8" },
        { name: "Champagne Accent", val: d.champagne_accent || "#E6D5AC" },
        { name: "Text Color", val: d.text_color || "#FAFAFA" },
      ];

      for (const c of colorsToValidate) {
        if (!isValidHexColor(c.val)) {
          toast.error(`Invalid ${c.name} color format. Please use 6-digit hex (e.g. #6B21A8)`);
          return;
        }
      }

      const slugResult = validateSlug(d.slug || d.full_name);
      if (!slugResult.valid) {
        toast.error(slugValidationMessage(slugResult, lang));
        return;
      }
      const slug = slugResult.slug;

      // Intercept client-side: Free users previewing Custom Creator cannot persist Pro styling to Supabase
      if (d.design_mode === "custom" && !isProEntitled(d)) {
        setUpgradeSource("publish_attempt");
        setUpgradeModalOpen(true);
        return;
      }

      if (userId === "guest") {
        try {
          writeCardDraft(window.localStorage, userId, { ...d, slug });
        } catch {
          /* ignore */
        }
        onSaved({ ...d, slug });
        return;
      }

      const avatar_url = await uploadDataUrlIfNeeded(d.avatar_url, userId, "avatar");
      const logo_url = await uploadDataUrlIfNeeded(d.logo_url, userId, "logo");

      const sanitizedSocialLinks = {
        linkedin: sanitizeUrl(d.social_links?.linkedin) || "",
        instagram: sanitizeUrl(d.social_links?.instagram) || "",
        twitter: sanitizeUrl(d.social_links?.twitter) || "",
        website: sanitizeUrl(d.social_links?.website) || "",
      };

      const payload = {
        user_id: userId,
        slug,
        full_name: sanitizeText(d.full_name, 100),
        phone: sanitizePhone(d.phone),
        email: d.email ? sanitizeText(d.email, 100) : null,
        title: d.title ? sanitizeText(d.title, 100) : null,
        company: d.company ? sanitizeText(d.company, 100) : null,
        bio: d.bio ? sanitizeText(d.bio, 1000) : null,
        avatar_url: avatar_url ? sanitizeUrl(avatar_url) : null,
        logo_url: logo_url ? sanitizeUrl(logo_url) : null,
        show_logo_badge: d.show_logo_badge,
        design_mode: d.design_mode || "classic_v2",
        header_pattern: d.header_pattern || "wave",
        accent_color: d.accent_color || "#6B21A8",
        bg_color: d.bg_color || "#08080A",
        surface_color: d.surface_color || "#121216",
        champagne_accent: d.champagne_accent || "#E6D5AC",
        text_color: d.text_color || "#FAFAFA",
        surface_finish: d.surface_finish || "matte",
        border_radius: d.border_radius || "minimal",
        font_family: d.font_family || "Outfit",
        whatsapp_phone: d.whatsapp_phone ? sanitizePhone(d.whatsapp_phone) : null,
        whatsapp_message: d.whatsapp_message ? sanitizeText(d.whatsapp_message, 250) : null,
        enable_arabic: d.enable_arabic,
        full_name_ar: d.full_name_ar ? sanitizeText(d.full_name_ar, 100) : null,
        title_ar: d.title_ar ? sanitizeText(d.title_ar, 100) : null,
        bio_ar: d.bio_ar ? sanitizeText(d.bio_ar, 1000) : null,
        social_links: sanitizedSocialLinks,
        pro_features: d.pro_features ?? {},
      };

      if (!isNew && !d.id) {
        setSaving(false);
        toast.error("This card cannot be updated because its identifier is missing.");
        return;
      }

      const result = await saveCardRecord<Card>(
        { isNew, cardId: d.id, userId, payload },
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
      setJustPublished(true);
      if (justPublishedTimerRef.current) {
        window.clearTimeout(justPublishedTimerRef.current);
      }
      justPublishedTimerRef.current = window.setTimeout(() => {
        setJustPublished(false);
      }, 3500);

      toast.success(isNew ? "Card published live!" : "Published changes live!");
      const wasComplete = isCardProfileComplete(lastPersistedCardRef.current);
      const isNowComplete = isCardProfileComplete(result.card);
      if (!wasComplete && isNowComplete) {
        void trackProfileCompleted(result.card.id, result.card.is_active);
      }
      lastPersistedCardRef.current = result.card;
      onSaved(result.card);
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
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

  const isProPreview = draft.design_mode === "custom" && !isPro;
  const isPublishedLive = Boolean(
    publishedCard && !isDirty && (draft.design_mode !== "custom" || isPro),
  );

  return (
    <div className="relative pb-24 space-y-6">
      {/* TOP EDITOR TOOLBAR / FLOATING HOTBAR */}
      <div
        data-testid="editor-hotbar"
        className="relative sm:sticky sm:top-4 z-40 justtap-glass rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border border-slate-800/80 shadow-xl backdrop-blur-xl bg-slate-950/80"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse w-full sm:w-auto justify-between sm:justify-start">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t("backToCards")}</span>
            </button>
          )}

          {/* Truthful Editor Status Bar */}
          <EditorStatusBar
            isDirty={isDirty}
            isSaving={saving}
            isPublishing={saving}
            justPublished={justPublished}
            isProPreview={isProPreview}
            isPublishedLive={isPublishedLive}
            lastAutoSaved={lastAutoSaved}
          />
        </div>

        {/* Action controls & Undo/Redo */}
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse w-full sm:w-auto justify-end">
          {/* History Undo / Redo */}
          <EditorHistoryControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />

          {!isNew && draft.id && (
            <button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              className="px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>
                {(draft.is_active ?? true) ? t("disablePublicProfile") : t("enablePublicProfile")}
              </span>
            </button>
          )}

          {/* Contextual Top Publish / Upgrade Action */}
          {isProPreview ? (
            <button
              type="button"
              data-testid="top-upgrade-cta"
              onClick={() => {
                setUpgradeSource("publish_attempt");
                setUpgradeModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-purple-700/20 flex items-center space-x-2 rtl:space-x-reverse transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t("upgradeToPublish")}</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="top-publish-cta"
              onClick={() => void publishChanges()}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-700/30 flex items-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-60 active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isNew ? t("publishCard") : t("publishChanges")}</span>
            </button>
          )}
        </div>
      </div>

      {draftRestored && (
        <div className="flex items-center justify-between rounded-xl bg-purple-950/40 border border-purple-800/40 px-4 py-2.5 text-xs text-purple-200">
          <span>{t("loadedDraftStorage")}</span>
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
            {t("clearDraft")}
          </button>
        </div>
      )}

      {/* NATURAL-TO-STICKY SECTION NAVIGATION */}
      <EditorSectionNav
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        showColorsTab={draft.design_mode === "custom"}
      />

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
          <div className="justtap-glass rounded-2xl p-2 flex items-center justify-between border border-slate-800 max-w-[340px] mx-auto gap-1.5">
            <button
              type="button"
              onClick={() => handleModeSwitch("classic_v2")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse ${
                draft.design_mode !== "custom"
                  ? "bg-purple-700 text-white shadow-md shadow-purple-700/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{t("modeClassicV2")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch("custom")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse gap-1 ${
                draft.design_mode === "custom"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("modeCustomCreator")}</span>
              <span
                data-testid="custom-creator-pro-marker"
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none uppercase tracking-wider ${
                  draft.design_mode === "custom"
                    ? "bg-slate-950/20 text-slate-950 border border-slate-950/20"
                    : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                }`}
              >
                {t("proMarker")}
              </span>
            </button>
          </div>

          {/* PERSISTENT CTA BELOW PHONE PREVIEW FOR FREE USERS */}
          {draft.design_mode === "custom" && !isPro && (
            <div
              data-testid="preview-dock-cta"
              className="justtap-glass rounded-2xl p-3.5 space-y-2 border border-amber-500/30 bg-amber-500/5 max-w-[340px] mx-auto text-center"
            >
              <div className="flex items-center justify-center">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t("proPreviewBadge")}
                </span>
              </div>
              <p className="text-xs font-semibold text-white">{t("proPreviewOnlyYou")}</p>
              <p className="text-[11px] text-slate-400">{t("proPreviewTrialHint")}</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="dock-upgrade-cta"
                  onClick={() => {
                    setUpgradeSource("preview_dock");
                    setUpgradeModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-700/20 transition-all active:scale-95"
                >
                  {t("upgradeToPublish")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Editors, Section Nav & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: PROFILE & MEDIA */}
          <CollapsibleSection
            id="section-profile"
            title={t("personalInfo")}
            icon={<User className="w-4 h-4" />}
            defaultOpen={true}
          >
            <Input
              label={t("fullName")}
              value={draft[langConfig.primary.fields.fullName] ?? ""}
              onChange={(v) => set(langConfig.primary.fields.fullName, v)}
              dir={langConfig.primary.dir}
              placeholder={t(langConfig.primary.placeholders.fullNameKey)}
            />
            <Input
              label={t("cardLink")}
              value={draft.slug}
              onChange={(v) => set("slug", slugify(v))}
              dir="ltr"
              placeholder="your-name"
              hint={`${t("cardLinkFormatNotice")} /c/${slugify(draft.slug || draft.full_name || "") || "your-name"}`}
            />
            <Input
              label={t("jobTitle")}
              value={draft[langConfig.primary.fields.title] ?? ""}
              onChange={(v) => set(langConfig.primary.fields.title, v)}
              dir={langConfig.primary.dir}
              placeholder={t(langConfig.primary.placeholders.jobTitleKey)}
            />
            <Input
              label={t("company")}
              value={draft.company ?? ""}
              onChange={(v) => set("company", v)}
            />
            <Input
              label={t("bio")}
              value={draft[langConfig.primary.fields.bio] ?? ""}
              onChange={(v) => set(langConfig.primary.fields.bio, v)}
              dir={langConfig.primary.dir}
              placeholder={t(langConfig.primary.placeholders.bioKey)}
              textarea
            />

            <div className="pt-3 border-t border-slate-800 space-y-4">
              <span className="text-xs font-semibold text-slate-300 block">{t("photosMedia")}</span>
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
            </div>
          </CollapsibleSection>

          {/* SECTION 2: CARD STYLE & FINISHES */}
          <CollapsibleSection
            id="section-style"
            title={t("sectionNavStyle")}
            icon={<Sliders className="w-4 h-4" />}
            defaultOpen={true}
          >
            {draft.design_mode === "custom" ? (
              <div className="space-y-6">
                {/* 1. HEADER DIVIDER PATTERNS */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t("headerDividerPattern")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PATTERNS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => set("header_pattern", p.value as HeaderPattern)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          draft.header_pattern === p.value
                            ? "border-amber-400 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SURFACE FINISHES */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t("surfaceFinish")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {FINISHES.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => set("surface_finish", f.value as SurfaceFinish)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          draft.surface_finish === f.value
                            ? "border-amber-400 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. CORNER STYLE & FONT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      {t("cornerStyle")}
                    </span>
                    <div className="flex gap-1.5">
                      {RADIUS_OPTIONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => set("border_radius", r.value as BorderRadius)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            draft.border_radius === r.value
                              ? "border-amber-400 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      {t("cardFont")}
                    </span>
                    <div className="flex gap-1.5">
                      {FONT_OPTIONS.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => set("font_family", font.value as FontFamily)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            draft.font_family === font.value
                              ? "border-amber-400 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Classic V2 uses JustTap's signature high-contrast dark theme, wave header, and
                  matte finish.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("custom")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold hover:bg-amber-400/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("modeCustomCreator")}</span>
                  </button>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* SECTION 3: PALETTES & 5 COLORS (Visible when Custom Creator is active) */}
          {draft.design_mode === "custom" && (
            <CollapsibleSection
              id="section-colors"
              title={t("sectionNavColors")}
              icon={<Palette className="w-4 h-4 text-amber-400" />}
              badge={
                !isPro ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    {t("proPreviewBadge")}
                  </span>
                ) : undefined
              }
              defaultOpen={true}
            >
              {/* Preset Palettes with persistent selected state & micro-feedback */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t("presetPalettes")}
                  </span>
                  {presetFeedback && (
                    <span
                      data-testid="preset-micro-feedback"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full animate-in fade-in duration-200"
                    >
                      <Check className="w-3 h-3 text-amber-400" />
                      {presetFeedback}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DESIGN_PRESET_PALETTES.map((preset) => {
                    const isSelected = isPresetSelected(preset);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        aria-pressed={isSelected}
                        data-testid={`preset-button-${preset.id}`}
                        className={`p-3 rounded-xl text-start transition-all space-y-1.5 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
                          isSelected
                            ? "bg-slate-900 ring-2 ring-amber-400 border border-amber-400/80 shadow-md shadow-amber-500/10"
                            : "bg-slate-900/80 border border-slate-800 hover:border-amber-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white block">{preset.name}</span>
                          {isSelected && (
                            <Check
                              data-testid="preset-selected-check"
                              className="w-3.5 h-3.5 text-amber-400 shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
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
                    );
                  })}
                </div>
              </div>

              {/* Five Color Controls */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">
                  {t("fiveColorControls")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <ColorPickerField
                    label={t("colorBg")}
                    value={draft.bg_color || "#08080A"}
                    onChange={(v) => set("bg_color", v)}
                  />
                  <ColorPickerField
                    label={t("colorSurface")}
                    value={draft.surface_color || "#121216"}
                    onChange={(v) => set("surface_color", v)}
                  />
                  <ColorPickerField
                    label={t("colorPrimaryAccent")}
                    value={draft.accent_color || "#6B21A8"}
                    onChange={(v) => set("accent_color", v)}
                  />
                  <ColorPickerField
                    label={t("colorChampagneAccent")}
                    value={draft.champagne_accent || "#E6D5AC"}
                    onChange={(v) => set("champagne_accent", v)}
                  />
                  <ColorPickerField
                    label={t("colorText")}
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
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-semibold text-amber-300">
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
            </CollapsibleSection>
          )}

          {/* SECTION 4: CONTACT DETAILS & SOCIAL LINKS */}
          <CollapsibleSection
            id="section-contact"
            title={t("contactDetails")}
            icon={<Phone className="w-4 h-4" />}
            defaultOpen={true}
          >
            <Input label={t("phoneNumber")} value={draft.phone} onChange={(v) => set("phone", v)} />
            <Input
              label={t("whatsappNumber")}
              value={draft.whatsapp_phone ?? ""}
              onChange={(v) => set("whatsapp_phone", v)}
              hint={t("whatsappHint")}
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

            <div className="pt-3 border-t border-slate-800 space-y-4">
              <span className="text-xs font-semibold text-slate-300 block">{t("socialLinks")}</span>
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
            </div>
          </CollapsibleSection>

          {/* SECTION 5: BILINGUAL */}
          <CollapsibleSection
            id="section-bilingual"
            title={t("sectionNavBilingual")}
            icon={<Globe className="w-4 h-4" />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">{t("bilingualSectionHeading")}</h4>
                <p className="text-xs text-slate-400">{t("bilingualSectionDesc")}</p>
              </div>

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

              {(showArabic || draft.enable_arabic) && (
                <div className="space-y-4 pt-1">
                  <Input
                    label={t("secondaryFullName")}
                    value={draft[langConfig.secondary.fields.fullName] ?? ""}
                    onChange={(v) => set(langConfig.secondary.fields.fullName, v)}
                    dir={langConfig.secondary.dir}
                    placeholder={t(langConfig.secondary.placeholders.fullNameKey)}
                  />
                  <Input
                    label={t("secondaryJobTitle")}
                    value={draft[langConfig.secondary.fields.title] ?? ""}
                    onChange={(v) => set(langConfig.secondary.fields.title, v)}
                    dir={langConfig.secondary.dir}
                    placeholder={t(langConfig.secondary.placeholders.jobTitleKey)}
                  />
                  <Input
                    label={t("secondaryBio")}
                    value={draft[langConfig.secondary.fields.bio] ?? ""}
                    onChange={(v) => set(langConfig.secondary.fields.bio, v)}
                    dir={langConfig.secondary.dir}
                    placeholder={t(langConfig.secondary.placeholders.bioKey)}
                    textarea
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* CONTEXTUAL PRIMARY BOTTOM ACTION */}
          <div className="justtap-glass rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-start">
                <h4 className="text-sm font-bold text-white">
                  {isProPreview
                    ? t("upgradeToPublish")
                    : isNew
                      ? t("publishCard")
                      : t("publishChanges")}
                </h4>
                <p className="text-xs text-slate-400">
                  {isProPreview
                    ? t("proPreviewNotLiveDesc")
                    : isDirty
                      ? `${t("draftSavedLocally")} · ${t("changesNotPublished")}`
                      : isPublishedLive
                        ? `${t("saved")} · ${t("editorStatusLiveCard")}`
                        : t("editorStatusSavedDraft")}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {isProPreview ? (
                  <button
                    type="button"
                    data-testid="bottom-upgrade-cta"
                    onClick={() => {
                      setUpgradeSource("publish_attempt");
                      setUpgradeModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-purple-700/20 flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{t("upgradeToPublish")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="bottom-publish-cta"
                    onClick={() => void publishChanges()}
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-700/30 flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-60 active:scale-95"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isNew ? t("publishCard") : t("publishChanges")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Preview Button */}
      <PreviewFab targetId="live-preview" />

      {/* CONFIRMATION MODAL FOR DEACTIVATING PUBLIC CARD */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <PowerOff className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                {(draft.is_active ?? true)
                  ? t("disablePublicModalTitle")
                  : t("enablePublicModalTitle")}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {(draft.is_active ?? true)
                  ? t("disablePublicModalDesc")
                  : t("enablePublicModalDesc")}
              </p>
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={() => void handleToggleDeactivate()}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse"
              >
                {deactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{t("confirm")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIAL STATUS BADGE — shown when account is actively trialing */}
      {draft.plan_tier === "trialing" &&
        draft.trial_ends_at &&
        (() => {
          const daysLeft = Math.ceil(
            (new Date(draft.trial_ends_at).getTime() - Date.now()) / 86_400_000,
          );
          if (daysLeft <= 0) return null;
          return (
            <div
              data-testid="trial-status-badge"
              className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 shadow-lg backdrop-blur-sm"
            >
              <Sparkles className="h-3 w-3" />
              {t("proTrialBadgePrefix")} · {daysLeft}{" "}
              {daysLeft !== 1 ? t("daysRemaining") : t("dayRemaining")}
            </div>
          );
        })()}

      {/* SHARED PRO UPGRADE DIALOG */}
      <ProUpgradeDialog
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        source={upgradeSource}
        draft={draft}
        session={session}
        onTrialStarted={(trialEndsAt) => {
          const updatedDraft = {
            ...draft,
            plan_tier: "trialing" as const,
            trial_ends_at: trialEndsAt.toISOString(),
          };
          updateDraft(updatedDraft);
          setUpgradeModalOpen(false);
        }}
      />
    </div>
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
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
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
  dir,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-purple-500"
        />
      )}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
