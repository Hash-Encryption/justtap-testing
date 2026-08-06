import { useEffect, useState, useRef } from "react";
import { ArrowUp, Check, ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { COLOR_PRESETS, PATTERNS, slugify, type Card, type HeaderPattern } from "@/lib/card";
import { CardView } from "@/components/card/CardView";
import { PhoneFrame } from "./PhoneFrame";
import { Dropzone } from "./Dropzone";

import { useTranslation } from "@/lib/i18n";

async function uploadDataUrlIfNeeded(
  dataUrl: string | null | undefined,
  userId: string,
  prefix: string
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
  onSaved: (c: Card) => void;
};

export function CardEditor({ draft, setDraft, userId, isNew, onSaved }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showArabic, setShowArabic] = useState(draft.enable_arabic);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);

  const draftKey = userId === "guest" ? "justtap_guest_pending_card" : `justtap_card_draft_${userId}`;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const restoredKeyRef = useRef<string | null>(null);

  // Restore active draft or purge if inactive for > 3 days (Runs ONCE per draftKey)
  useEffect(() => {
    if (restoredKeyRef.current === draftKey) return;
    restoredKeyRef.current = draftKey;

    try {
      const stored = localStorage.getItem(draftKey) || sessionStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { card?: Card; updatedAt?: number } | Card;
        const cardData = "card" in parsed && parsed.card ? parsed.card : (parsed as Card);
        const updatedAt = "updatedAt" in parsed && typeof parsed.updatedAt === "number" ? parsed.updatedAt : null;

        // Purge draft if inactive for more than 3 days
        if (updatedAt && Date.now() - updatedAt > THREE_DAYS_MS) {
          localStorage.removeItem(draftKey);
          sessionStorage.removeItem(draftKey);
        } else if (cardData && (cardData.full_name || cardData.phone || cardData.title || cardData.bio)) {
          // Only trigger state update and toast if the current draft prop is empty
          const isCurrentDraftEmpty = !draft.full_name && !draft.phone && !draft.title && !draft.bio;
          if (isCurrentDraftEmpty) {
            setDraft(cardData);
            setShowArabic(cardData.enable_arabic);
            setDraftRestored(true);
            toast.info("Restored your active draft");
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, [draftKey]);

  // Real-time auto-save draft with timestamp
  useEffect(() => {
    if (!draft.full_name && !draft.phone && !draft.title && !draft.bio) return;

    try {
      const payload = JSON.stringify({ card: draft, updatedAt: Date.now() });
      localStorage.setItem(draftKey, payload);
      sessionStorage.setItem(draftKey, payload);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastAutoSaved(now);
    } catch {
      // Ignore storage errors
    }
  }, [draft, draftKey]);

  const set = <K extends keyof Card>(key: K, value: Card[K]) => setDraft({ ...draft, [key]: value });
  const setSocial = (key: string, value: string) =>
    setDraft({ ...draft, social_links: { ...(draft.social_links ?? {}), [key]: value } });

  async function save(): Promise<void> {
    if (!draft.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!draft.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    const slug = slugify(draft.slug || draft.full_name);
    if (!slug) {
      toast.error("A valid nickname is required");
      return;
    }

    if (userId === "guest") {
      try {
        const payloadStr = JSON.stringify({ card: { ...draft, slug }, updatedAt: Date.now() });
        localStorage.setItem("justtap_guest_pending_card", payloadStr);
        sessionStorage.setItem("justtap_guest_pending_card", payloadStr);
      } catch {}
      onSaved({ ...draft, slug });
      return;
    }

    setSaving(true);
    const avatar_url = await uploadDataUrlIfNeeded(draft.avatar_url, userId, "avatar");
    const logo_url = await uploadDataUrlIfNeeded(draft.logo_url, userId, "logo");

    const payload = {
      user_id: userId,
      slug,
      full_name: draft.full_name.trim(),
      phone: draft.phone.trim(),
      email: draft.email || null,
      title: draft.title || null,
      company: draft.company || null,
      bio: draft.bio || null,
      avatar_url,
      logo_url,
      show_logo_badge: draft.show_logo_badge,
      header_pattern: draft.header_pattern,
      accent_color: draft.accent_color,
      bg_color: draft.bg_color,
      whatsapp_phone: draft.whatsapp_phone || null,
      whatsapp_message: draft.whatsapp_message || null,
      enable_arabic: draft.enable_arabic,
      full_name_ar: draft.full_name_ar || null,
      title_ar: draft.title_ar || null,
      bio_ar: draft.bio_ar || null,
      social_links: draft.social_links ?? {},
    };

    const query = isNew
      ? supabase.from("cards").insert(payload).select().single()
      : supabase.from("cards").update(payload).eq("id", draft.id).select().single();

    const { data, error } = await query;
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That nickname is already taken — try another." : error.message,
      );
      return;
    }
    // Remove local draft upon successful database save
    try {
      localStorage.removeItem(draftKey);
      sessionStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    toast.success(isNew ? "Card published!" : "Changes saved");
    onSaved(data as Card);
  }

  return (
    <div className="relative pb-16">
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-medium text-primary">
          <span>Loaded your auto-saved draft from browser storage.</span>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(draftKey);
                sessionStorage.removeItem(draftKey);
              } catch {}
              setDraftRestored(false);
            }}
            aria-label="Dismiss draft notification"
            className="underline opacity-80 hover:opacity-100"
          >
            Clear draft
          </button>
        </div>
      )}

      {/* LIVE PREVIEW */}
      <div id="live-preview" className="scroll-mt-24">
        <PhoneFrame>
          <CardView card={draft} preview />
        </PhoneFrame>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? "Publish card" : "Save changes"}
          </button>
          {!isNew && (
            <a
              href={`/c/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View live
            </a>
          )}
        </div>
      </div>

      {/* STYLE PANEL */}
      <Section title={t("quickStyling")}>
        <Field label={t("accentColor")}>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                title={p.name}
                onClick={() => set("accent_color", p.value)}
                className="relative h-9 w-9 rounded-full border border-border transition hover:scale-110"
                style={{ backgroundColor: p.value }}
              >
                {draft.accent_color === p.value && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                )}
              </button>
            ))}
            <label className="flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs">
              <input
                type="color"
                value={draft.accent_color}
                onChange={(e) => set("accent_color", e.target.value)}
                className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
              />
              Custom
            </label>
          </div>
        </Field>

        <Field label={t("cardBackground")}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft.bg_color}
              onChange={(e) => set("bg_color", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <input
              value={draft.bg_color}
              onChange={(e) => set("bg_color", e.target.value)}
              className="h-9 w-28 rounded-lg border border-border bg-transparent px-3 text-xs"
            />
          </div>
        </Field>

        <Field label={t("headerPattern")}>
          <div className="flex gap-2">
            {PATTERNS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("header_pattern", p.value as HeaderPattern)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  draft.header_pattern === p.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={draft.show_logo_badge}
            onChange={(e) => set("show_logo_badge", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t("showLogoBadge")}
        </label>
      </Section>

      <Section title={t("personalInfo")}>
        <Input label={t("fullName")} value={draft.full_name} onChange={(v) => set("full_name", v)} />
        <Input
          label={t("cardLink")}
          value={draft.slug}
          onChange={(v) => set("slug", slugify(v))}
          hint={`/c/${slugify(draft.slug || draft.full_name) || "your-name"}`}
        />
        <Input label={t("jobTitle")} value={draft.title ?? ""} onChange={(v) => set("title", v)} />
        <Input label={t("company")} value={draft.company ?? ""} onChange={(v) => set("company", v)} />
        <Input label={t("bio")} value={draft.bio ?? ""} onChange={(v) => set("bio", v)} textarea />
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
        <Input label={t("emailAddress")} value={draft.email ?? ""} onChange={(v) => set("email", v)} />
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
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={draft.enable_arabic}
            onChange={(e) => {
              set("enable_arabic", e.target.checked);
              setShowArabic(e.target.checked);
            }}
            className="h-4 w-4 accent-primary"
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

      {/* STICKY BOTTOM SAVE & PREVIEW BAR */}
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border/80 bg-background/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl transition-all">
        {lastAutoSaved && (
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("autoSavedAt")} {lastAutoSaved}
          </span>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isNew ? t("publishCard") : t("saveChanges")}
        </button>
        <button
          type="button"
          onClick={() =>
            document.getElementById("live-preview")?.scrollIntoView({ behavior: "smooth" })
          }
          className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
        >
          <ArrowUp className="h-3.5 w-3.5" /> {t("previewCard")}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass mt-5 space-y-4 rounded-2xl p-5">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
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
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-ring"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-ring"
        />
      )}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
