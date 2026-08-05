import { useState } from "react";
import { ArrowUp, Check, ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { COLOR_PRESETS, PATTERNS, slugify, type Card, type HeaderPattern } from "@/lib/card";
import { CardView } from "@/components/card/CardView";
import { PhoneFrame } from "./PhoneFrame";
import { Dropzone } from "./Dropzone";

type Props = {
  draft: Card;
  setDraft: (c: Card) => void;
  userId: string;
  isNew: boolean;
  onSaved: (c: Card) => void;
};

export function CardEditor({ draft, setDraft, userId, isNew, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [showArabic, setShowArabic] = useState(draft.enable_arabic);

  const set = <K extends keyof Card>(key: K, value: Card[K]) => setDraft({ ...draft, [key]: value });
  const setSocial = (key: string, value: string) =>
    setDraft({ ...draft, social_links: { ...(draft.social_links ?? {}), [key]: value } });

  async function save() {
    if (!draft.full_name.trim()) return toast.error("Full name is required");
    if (!draft.phone.trim()) return toast.error("Phone number is required");
    const slug = slugify(draft.slug || draft.full_name);
    if (!slug) return toast.error("A valid card link (slug) is required");

    setSaving(true);
    const payload = {
      user_id: userId,
      slug,
      full_name: draft.full_name.trim(),
      phone: draft.phone.trim(),
      email: draft.email || null,
      title: draft.title || null,
      company: draft.company || null,
      bio: draft.bio || null,
      avatar_url: draft.avatar_url,
      logo_url: draft.logo_url,
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
        error.code === "23505" ? "That card link is already taken — try another." : error.message,
      );
      return;
    }
    toast.success(isNew ? "Card published!" : "Changes saved");
    onSaved(data as Card);
  }

  return (
    <div className="relative">
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
      <Section title="Quick styling">
        <Field label="Accent color">
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

        <Field label="Card background">
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

        <Field label="Header pattern">
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
          Show circular floating logo badge
        </label>
      </Section>

      <Section title="Personal info">
        <Input label="Full name *" value={draft.full_name} onChange={(v) => set("full_name", v)} />
        <Input
          label="Card link (slug)"
          value={draft.slug}
          onChange={(v) => set("slug", slugify(v))}
          hint={`/c/${slugify(draft.slug || draft.full_name) || "your-name"}`}
        />
        <Input label="Job title" value={draft.title ?? ""} onChange={(v) => set("title", v)} />
        <Input label="Company" value={draft.company ?? ""} onChange={(v) => set("company", v)} />
        <Input label="Bio" value={draft.bio ?? ""} onChange={(v) => set("bio", v)} textarea />
      </Section>

      <Section title="Photos & media">
        <Dropzone
          label="Profile photo"
          value={draft.avatar_url}
          userId={userId}
          onChange={(url) => set("avatar_url", url)}
        />
        <Dropzone
          label="Logo badge (transparent PNG/SVG)"
          value={draft.logo_url}
          userId={userId}
          round
          onChange={(url) => set("logo_url", url)}
        />
      </Section>

      <Section title="Contact details">
        <Input label="Phone number *" value={draft.phone} onChange={(v) => set("phone", v)} />
        <Input
          label="WhatsApp number"
          value={draft.whatsapp_phone ?? ""}
          onChange={(v) => set("whatsapp_phone", v)}
          hint="Include country code, e.g. 966501234567"
        />
        <Input
          label="WhatsApp prefilled message"
          value={draft.whatsapp_message ?? ""}
          onChange={(v) => set("whatsapp_message", v)}
        />
        <Input label="Email address" value={draft.email ?? ""} onChange={(v) => set("email", v)} />
      </Section>

      <Section title="Social links">
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

      <Section title="Bilingual (Arabic)">
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
          Enable EN / AR switcher on the card
        </label>
        {showArabic && (
          <div className="space-y-4 pt-2" dir="rtl">
            <Input
              label="الاسم بالعربية"
              value={draft.full_name_ar ?? ""}
              onChange={(v) => set("full_name_ar", v)}
            />
            <Input
              label="المسمى الوظيفي"
              value={draft.title_ar ?? ""}
              onChange={(v) => set("title_ar", v)}
            />
            <Input
              label="نبذة"
              value={draft.bio_ar ?? ""}
              onChange={(v) => set("bio_ar", v)}
              textarea
            />
          </div>
        )}
      </Section>

      <button
        type="button"
        onClick={() =>
          document.getElementById("live-preview")?.scrollIntoView({ behavior: "smooth" })
        }
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg"
      >
        <ArrowUp className="h-4 w-4" /> Jump to preview
      </button>
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
