import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DESIGN_PRESET_PALETTES, emptyCard, type Card } from "@/lib/card";
import { CardEditor } from "./CardEditor";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorSectionNav } from "./EditorSectionNav";
import { EditorHistoryControls } from "./EditorHistoryControls";
import { CollapsibleSection } from "./CollapsibleSection";
import { PreviewFab } from "./PreviewFab";
import { QrTab } from "./QrTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { LanguageProvider } from "@/lib/i18n";
import { extractVisualState, isSameVisualState } from "@/hooks/useEditorHistory";

const baseFreeCard: Card = {
  ...emptyCard,
  id: "free-card-1",
  user_id: "user-free-1",
  slug: "alex-founder",
  full_name: "Alex Founder",
  phone: "+15551234567",
  plan_tier: "free",
  design_mode: "classic_v2",
};

const customFreeCard: Card = {
  ...baseFreeCard,
  design_mode: "custom",
  bg_color: "#07111F",
  surface_color: "#0D1A2B",
  accent_color: "#2E6FDB",
  champagne_accent: "#E6D5AC",
  text_color: "#F8FAFC",
};

const proEntitledCard: Card = {
  ...customFreeCard,
  id: "pro-card-1",
  user_id: "user-pro-1",
  plan_tier: "pro",
};

describe("Card Editor UX Clarity & Polish Suite", () => {
  // 1-6. Floating Preview
  describe("Floating Preview", () => {
    it("1. Preview FAB renders with visible Preview text and jump accessibility label", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <PreviewFab targetId="live-preview" />
        </LanguageProvider>,
      );
      expect(html).toContain("Preview");
      expect(html).toContain('aria-label="Jump to preview"');
      expect(html).toContain('data-testid="preview-fab"');
    });

    it("2. targets the existing live-preview container without duplicate previews", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={baseFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      // Contains the single live-preview anchor
      expect(html).toContain('id="live-preview"');
      // Verify there is only one PhoneFrame screen in markup
      const phoneScreenCount = (html.match(/data-phone-screen/g) || []).length;
      expect(phoneScreenCount).toBe(1);
    });

    it("3. renders Preview FAB with Arabic localization in RTL mode", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <PreviewFab targetId="live-preview" />
        </LanguageProvider>,
      );
      expect(html).toContain("معاينة");
      expect(html).toContain('aria-label="الانتقال للمعاينة"');
    });
  });

  // 7-11. Presets & Micro-feedback
  describe("Preset Palettes & Selected State", () => {
    it("7. correctly identifies selected preset matching the 5 colors in Custom Creator", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={customFreeCard} // Executive Navy colors
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );

      // Executive Navy should be aria-pressed="true" with visual ring and check marker, without persistent text
      expect(html).toContain('data-testid="preset-button-executive_navy"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain("ring-2 ring-amber-400");
      expect(html).toContain('data-testid="preset-selected-check"');
      expect(html).not.toContain("Selected");

      // Other presets should be aria-pressed="false"
      expect(html).toContain('data-testid="preset-button-emerald_noir"');
      expect(html).toContain('aria-pressed="false"');
    });

    it("8. renders all 4 presets as unselected if colors are manually customized", () => {
      const manualCard: Card = {
        ...customFreeCard,
        bg_color: "#123456", // Custom hex not in presets
      };
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={manualCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );

      for (const preset of DESIGN_PRESET_PALETTES) {
        expect(html).toContain(`data-testid="preset-button-${preset.id}"`);
      }
      // None of the preset buttons should have Selected indicator
      expect(html).not.toContain('aria-pressed="true"');
      expect(html).not.toContain('data-testid="preset-selected-check"');
    });

    it("9. provides accessible semantics and visual selected check marker in Arabic without literal Selected text", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={customFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain('data-testid="preset-button-executive_navy"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('data-testid="preset-selected-check"');
      expect(html).not.toContain("محدد");
    });
  });

  // 12-16. Status Bar Truthfulness
  describe("Editor Status Bar", () => {
    it("12. renders Saved · Live card when publishedCard matches draft", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={false}
            isSaving={false}
            isPublishing={false}
            justPublished={false}
            isProPreview={false}
            isPublishedLive={true}
            lastAutoSaved={null}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Saved · Live card");
      expect(html).not.toContain("Unsaved changes");
    });

    it("13. renders Draft saved locally · Changes not published when isDirty is true with auto-save", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={true}
            isSaving={false}
            isPublishing={false}
            justPublished={false}
            isProPreview={false}
            isPublishedLive={false}
            lastAutoSaved="10:45 AM"
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Draft saved locally");
      expect(html).toContain("Changes not published");
      expect(html).not.toContain("Unsaved Changes · Auto-saved");
    });

    it("14. renders Pro Preview · Not published for Free users in Pro Preview", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={false}
            isSaving={false}
            isPublishing={false}
            justPublished={false}
            isProPreview={true}
            isPublishedLive={false}
            lastAutoSaved={null}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Pro Preview · Not published");
      expect(html).not.toContain("Live card");
    });

    it("15. renders Draft saved locally · Not published for new/unpublished draft", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={false}
            isSaving={false}
            isPublishing={false}
            justPublished={false}
            isProPreview={false}
            isPublishedLive={false}
            lastAutoSaved={null}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Draft saved locally · Not published");
    });

    it("16. renders Published temporary feedback and Publishing… state truthfully", () => {
      const publishingHtml = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={false}
            isSaving={false}
            isPublishing={true}
            justPublished={false}
            isProPreview={false}
            isPublishedLive={false}
            lastAutoSaved={null}
          />
        </LanguageProvider>,
      );
      expect(publishingHtml).toContain("Publishing…");

      const publishedHtml = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorStatusBar
            isDirty={false}
            isSaving={false}
            isPublishing={false}
            justPublished={true}
            isProPreview={false}
            isPublishedLive={true}
            lastAutoSaved={null}
          />
        </LanguageProvider>,
      );
      expect(publishedHtml).toContain("Published");
    });
  });

  // 17-18. Section Navigation
  describe("Sticky Section Navigation", () => {
    it("17. renders section navigation items targeting correct editor areas", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorSectionNav
            activeSection="profile"
            onSectionClick={() => {}}
            showColorsTab={true}
          />
        </LanguageProvider>,
      );
      expect(html).toContain('data-section-id="profile"');
      expect(html).toContain('data-section-id="style"');
      expect(html).toContain('data-section-id="colors"');
      expect(html).toContain('data-section-id="contact"');
      expect(html).toContain('data-section-id="bilingual"');
      expect(html).toContain("Profile");
      expect(html).toContain("Style");
      expect(html).toContain("Colors");
      expect(html).toContain("Contact");
      expect(html).toContain("Bilingual");
    });

    it("18. marks active section with aria-current", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorSectionNav activeSection="colors" onSectionClick={() => {}} showColorsTab={true} />
        </LanguageProvider>,
      );
      expect(html).toContain('data-section-id="colors" aria-current="true"');
    });

    it("19. hides colors tab when in Classic V2 mode", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorSectionNav
            activeSection="profile"
            onSectionClick={() => {}}
            showColorsTab={false}
          />
        </LanguageProvider>,
      );
      expect(html).not.toContain('data-section-id="colors"');
    });
  });

  // 19-22. Undo / Redo History Layer
  describe("Undo / Redo History", () => {
    it("20. extracts visual state accurately without side effects", () => {
      const visual = extractVisualState(customFreeCard);
      expect(visual.design_mode).toBe("custom");
      expect(visual.bg_color).toBe("#07111F");
      expect(visual.surface_color).toBe("#0D1A2B");
      expect(visual.accent_color).toBe("#2E6FDB");
      expect(visual.champagne_accent).toBe("#E6D5AC");
      expect(visual.text_color).toBe("#F8FAFC");
    });

    it("21. compares visual states accurately with isSameVisualState", () => {
      const visualA = extractVisualState(customFreeCard);
      const visualB = extractVisualState({ ...customFreeCard });
      expect(isSameVisualState(visualA, visualB)).toBe(true);

      const visualC = extractVisualState({ ...customFreeCard, accent_color: "#123456" });
      expect(isSameVisualState(visualA, visualC)).toBe(false);
    });

    it("22. renders history controls with disabled states when history is at boundary", () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();

      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <EditorHistoryControls canUndo={false} canRedo={true} onUndo={onUndo} onRedo={onRedo} />
        </LanguageProvider>,
      );
      expect(html).toContain('aria-label="Undo"');
      expect(html).toContain('aria-label="Redo"');
      expect(html).toContain("disabled=");
    });
  });

  // 23-24. Progressive Disclosure / Collapsible Sections
  describe("Progressive Disclosure", () => {
    it("23. renders collapsible section with accessible aria-expanded and title", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CollapsibleSection id="section-profile" title="Personal info" defaultOpen={true}>
            <div data-testid="profile-form-content">Input fields</div>
          </CollapsibleSection>
        </LanguageProvider>,
      );
      expect(html).toContain('id="section-profile"');
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain("Personal info");
      expect(html).toContain("Input fields");
    });

    it("24. preserves content in DOM even when collapsed to prevent data loss", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CollapsibleSection id="section-profile" title="Personal info" defaultOpen={false}>
            <div data-testid="profile-form-content">Input fields preserved</div>
          </CollapsibleSection>
        </LanguageProvider>,
      );
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain("Input fields preserved");
      expect(html).toContain("hidden");
    });
  });

  // 25-27. Contextual Actions
  describe("Contextual Primary Action", () => {
    it("25. renders Publish Changes for Free standard Classic V2 user", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={baseFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Publish Changes");
      expect(html).not.toContain("Upgrade to Publish");
    });

    it("26. renders Upgrade to Publish with explanation for Free Pro Preview user", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={customFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Upgrade to Publish");
      expect(html).toContain("Pro Preview · These changes aren&#x27;t live yet");
    });

    it("27. renders Publish Changes for legitimately entitled Pro user with Custom Creator", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={proEntitledCard}
            setDraft={() => {}}
            userId="user-pro-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("Publish Changes");
      expect(html).not.toContain("Upgrade to Publish");
    });
  });

  // 28. Full Arabic RTL Support
  describe("Bilingual Arabic & RTL Support", () => {
    it("28. renders complete localized editor under Arabic locale", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={{ ...customFreeCard, enable_arabic: true }}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain("الملف الشخصي");
      expect(html).toContain("التصميم");
      expect(html).toContain("الألوان");
      expect(html).toContain("الاتصال");
      expect(html).toContain("اللغة العربية");
      expect(html).toContain("الترقية للنشر");
      expect(html).toContain("معاينة PRO · هذه التغييرات ليست منشورة بعد");
      expect(html).toContain("تراجع");
      expect(html).toContain("إعادة");
    });
  });

  // 29-31. Floating Hotbar & Preset Polish (Phase 1)
  describe("Floating Hotbar & Preset Polish", () => {
    it("29. renders floating editor hotbar with sticky classes and primary actions", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={baseFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain('data-testid="editor-hotbar"');
      expect(html).toContain("sticky");
      expect(html).toContain('data-testid="editor-status-bar"');
    });

    it("30. renders small check marker and ring highlight directly on the selected preset without persistent Selected / محدد text", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={customFreeCard}
            setDraft={() => {}}
            userId="user-free-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LanguageProvider>,
      );
      expect(html).toContain('data-testid="preset-button-executive_navy"');
      expect(html).toContain("ring-2 ring-amber-400");
      expect(html).toContain('data-testid="preset-selected-check"');
      expect(html).not.toContain("Selected");
      expect(html).not.toContain("محدد");
    });

    it("31. renders Arabic status bar truthfully for auto-saved drafts without contradictory messages", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <EditorStatusBar
            isDirty={true}
            isSaving={false}
            isPublishing={false}
            justPublished={false}
            isProPreview={false}
            isPublishedLive={false}
            lastAutoSaved="10:45"
          />
        </LanguageProvider>,
      );
      expect(html).toContain("تم حفظ المسودة محلياً");
      expect(html).toContain("تعديلات غير منشورة");
      expect(html).not.toContain("تعديلات غير محفوظة");
    });
  });

  // 32-35. QR & Analytics Product Simplification (Phase 1)
  describe("QR & Analytics Product Simplification", () => {
    it("32. renders QR hub with simplified 2-mode product model (JustTap Card and Offline Contact)", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <QrTab card={baseFreeCard} />
        </LanguageProvider>,
      );
      expect(html).toContain('data-testid="qr-selector-card"');
      expect(html).toContain('data-testid="qr-selector-offline"');
      expect(html).toContain("JustTap Card");
      expect(html).toContain("Offline Contact");
      expect(html).not.toContain("Permanent Tag QR");
      expect(html).not.toContain("/t/:token");
      expect(html).not.toContain("/t/{token}");
    });

    it("33. renders Arabic localized QR hub with natural simplified copy", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <QrTab card={baseFreeCard} />
        </LanguageProvider>,
      );
      expect(html).toContain("بطاقة JustTap");
      expect(html).toContain("جهة اتصال دون إنترنت");
      expect(html).toContain("يفتح ملف بطاقة أعمالك الرقمية المباشرة على JustTap.");
    });

    it("34. renders Analytics traffic sources with simplified JustTap Card and Link labels", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="en">
          <AnalyticsTab cardId="free-card-1" isPro={false} />
        </LanguageProvider>,
      );
      expect(html).toContain("JustTap Card");
      expect(html).toContain("Link");
      expect(html).not.toContain("Permanent Tag");
      expect(html).not.toContain("Profile QR");
    });

    it("35. renders Arabic Analytics traffic sources with simplified labels", () => {
      const html = renderToStaticMarkup(
        <LanguageProvider defaultLang="ar">
          <AnalyticsTab cardId="free-card-1" isPro={false} />
        </LanguageProvider>,
      );
      expect(html).toContain("بطاقة JustTap");
      expect(html).toContain("الرابط");
    });
  });
});
