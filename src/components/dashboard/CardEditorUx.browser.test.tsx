import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CardEditor } from "./CardEditor";
import { EditorSectionNav } from "./EditorSectionNav";
import { PreviewFab } from "./PreviewFab";
import { emptyCard, type Card } from "@/lib/card";
import { LanguageProvider } from "@/lib/i18n";
import "@/styles.css";

let root: Root | undefined;

const testCard: Card = {
  ...emptyCard,
  id: "editor-browser-test",
  slug: "browser-test",
  full_name: "Browser Tester",
  title: "UX Specialist",
  company: "JustTap",
  bio: "Testing responsive layout and UX controls.",
  phone: "+966501234567",
  email: "browser@example.com",
  plan_tier: "free",
  design_mode: "custom",
  bg_color: "#07111F",
  surface_color: "#0D1A2B",
  accent_color: "#2E6FDB",
  champagne_accent: "#E6D5AC",
  text_color: "#F8FAFC",
};

function renderEditor(card: Card, lang: "en" | "ar" = "en") {
  const container = document.createElement("div");
  container.id = "browser-test-root";
  document.body.appendChild(container);

  root = createRoot(container);
  flushSync(() => {
    root?.render(
      <LanguageProvider defaultLang={lang}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
          <CardEditor
            draft={card}
            setDraft={() => {}}
            userId="user-test-1"
            isNew={false}
            onSaved={() => {}}
          />
        </div>
      </LanguageProvider>,
    );
  });
}

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

afterEach(() => {
  root?.unmount();
  const el = document.getElementById("browser-test-root");
  if (el) el.remove();
});

describe("CardEditor Browser UX Suite", () => {
  it("renders editor without horizontal overflow at mobile 375px and 412px in LTR and RTL", async () => {
    for (const width of ["375px", "412px"]) {
      for (const lang of ["en" as const, "ar" as const]) {
        const container = document.createElement("div");
        container.id = "browser-test-root";
        container.style.width = width;
        container.style.maxWidth = width;
        container.style.overflowX = "hidden";
        document.body.appendChild(container);

        root = createRoot(container);
        flushSync(() => {
          root?.render(
            <LanguageProvider defaultLang={lang}>
              <CardEditor
                draft={testCard}
                setDraft={() => {}}
                userId="user-test-1"
                isNew={false}
                onSaved={() => {}}
              />
            </LanguageProvider>,
          );
        });
        await nextPaint();

        const statusBar = document.querySelector<HTMLElement>('[data-testid="editor-status-bar"]');
        const sectionNav = document.querySelector<HTMLElement>(
          '[data-testid="editor-section-nav"]',
        );
        const previewAnchor = document.getElementById("live-preview");
        const bottomCta = document.querySelector<HTMLElement>('[data-testid="bottom-upgrade-cta"]');

        expect(statusBar).not.toBeNull();
        expect(sectionNav).not.toBeNull();
        expect(previewAnchor).not.toBeNull();
        expect(bottomCta).not.toBeNull();

        // 1. Mobile document order: section nav appears BEFORE phone preview
        expect(
          sectionNav!.compareDocumentPosition(previewAnchor!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        // 2. Mobile horizontal containment (no overflow beyond mobile viewport)
        expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth + 1);

        root?.unmount();
        container.remove();
      }
    }
  });

  it("ensures preset buttons are clickable and display active selected ring", async () => {
    renderEditor(testCard, "en");
    await nextPaint();

    const executivePreset = document.querySelector<HTMLElement>(
      '[data-testid="preset-button-executive_navy"]',
    );
    expect(executivePreset).not.toBeNull();
    expect(executivePreset?.getAttribute("aria-pressed")).toBe("true");

    const emeraldPreset = document.querySelector<HTMLElement>(
      '[data-testid="preset-button-emerald_noir"]',
    );
    expect(emeraldPreset).not.toBeNull();
    expect(emeraldPreset?.getAttribute("aria-pressed")).toBe("false");
  });

  it("ensures floating section navigation uses sticky geometry, touch-friendly targets, and coexists with PreviewFab", async () => {
    renderEditor(testCard, "en");
    await nextPaint();

    const navWrapper = document.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );
    expect(navWrapper).not.toBeNull();

    const navComputed = window.getComputedStyle(navWrapper!);
    expect(navComputed.position).toBe("sticky");
    expect(Number(navComputed.zIndex)).toBeGreaterThanOrEqual(30);

    const navButtons = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="editor-section-nav"] button'),
    );
    expect(navButtons.length).toBeGreaterThanOrEqual(4);

    for (const btn of navButtons) {
      const rect = btn.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(30);
      expect(rect.width).toBeGreaterThanOrEqual(36);
    }
  });

  it("proves PreviewFab and floating section nav coexist independently with non-conflicting spatial layers", async () => {
    const container = document.createElement("div");
    container.id = "browser-test-root";
    document.body.appendChild(container);

    root = createRoot(container);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="en">
          <div className="relative min-h-[800px]">
            <EditorSectionNav
              activeSection="profile"
              onSectionClick={() => {}}
              showColorsTab={true}
            />
            {/* Render PreviewFab with nonexistent target so it immediately displays */}
            <PreviewFab targetId="nonexistent-anchor" />
          </div>
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const navWrapper = document.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );
    const previewFab = document.querySelector<HTMLElement>('[data-testid="preview-fab"]');

    expect(navWrapper).not.toBeNull();
    expect(previewFab).not.toBeNull();

    const navRect = navWrapper!.getBoundingClientRect();
    const fabRect = previewFab!.getBoundingClientRect();

    // Floating section navigation is situated at the top; PreviewFab floats at the bottom-right
    expect(navRect.top).toBeLessThan(fabRect.top);
    expect(fabRect.bottom).toBeGreaterThan(navRect.bottom + 100);

    root?.unmount();
    container.remove();
  });

  it("proves mobile section nav exhibits natural-to-sticky behavior (starts in flow, scrolls up, sticks at top, and releases when scrolling back)", async () => {
    for (const width of ["375px", "390px", "412px"]) {
      for (const lang of ["en" as const, "ar" as const]) {
        const container = document.createElement("div");
        container.id = "browser-test-root";
        container.style.width = width;
        container.style.maxWidth = width;
        container.style.height = "600px";
        container.style.overflowY = "auto";
        container.style.overflowX = "hidden";
        document.body.appendChild(container);

        root = createRoot(container);
        flushSync(() => {
          root?.render(
            <LanguageProvider defaultLang={lang}>
              <CardEditor
                draft={testCard}
                setDraft={() => {}}
                userId="user-test-1"
                isNew={false}
                onSaved={() => {}}
              />
            </LanguageProvider>,
          );
        });
        await nextPaint();

        const hotbar = container.querySelector<HTMLElement>('[data-testid="editor-hotbar"]');
        const navWrapper = container.querySelector<HTMLElement>(
          '[data-testid="editor-section-nav-wrapper"]',
        );
        const preview = container.querySelector<HTMLElement>("#live-preview");

        expect(hotbar).not.toBeNull();
        expect(navWrapper).not.toBeNull();
        expect(preview).not.toBeNull();

        // 1. Initial document order: hotbar -> nav -> preview
        const initialHotbarRect = hotbar!.getBoundingClientRect();
        const initialNavRect = navWrapper!.getBoundingClientRect();
        const initialPreviewRect = preview!.getBoundingClientRect();

        expect(initialHotbarRect.top).toBeLessThan(initialNavRect.top);
        expect(initialNavRect.top).toBeLessThan(initialPreviewRect.top);

        // 2. Partial scroll: nav moves upward naturally with document flow before sticking
        container.scrollTop = 40;
        await nextPaint();
        const partialNavRect = navWrapper!.getBoundingClientRect();
        expect(partialNavRect.top).toBeLessThan(initialNavRect.top);

        // 3. Significant scroll: hotbar scrolls away, nav sticks at the top
        container.scrollTop = 300;
        await nextPaint();
        const stuckNavRect = navWrapper!.getBoundingClientRect();
        const stuckHotbarRect = hotbar!.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Nav is stuck at the container top (approx containerRect.top)
        expect(Math.abs(stuckNavRect.top - containerRect.top)).toBeLessThanOrEqual(5);
        // Mobile hotbar has scrolled away above the sticky nav
        expect(stuckHotbarRect.bottom).toBeLessThanOrEqual(stuckNavRect.top + 5);

        // 4. Further scroll: nav remains stuck at top
        container.scrollTop = 600;
        await nextPaint();
        const furtherNavRect = navWrapper!.getBoundingClientRect();
        expect(Math.abs(furtherNavRect.top - containerRect.top)).toBeLessThanOrEqual(5);

        // 5. Release on scroll back: scrolling back to 0 restores natural position
        container.scrollTop = 0;
        await nextPaint();
        const restoredNavRect = navWrapper!.getBoundingClientRect();
        expect(Math.abs(restoredNavRect.top - initialNavRect.top)).toBeLessThanOrEqual(2);

        root?.unmount();
        container.remove();
      }
    }
  });

  it("proves clicking section buttons triggers section jumping and sets active tab in EN and AR/RTL", async () => {
    for (const lang of ["en" as const, "ar" as const]) {
      const container = document.createElement("div");
      container.id = "browser-test-root";
      container.style.width = "375px";
      container.style.height = "700px";
      container.style.overflowY = "auto";
      container.style.overflowX = "hidden";
      document.body.appendChild(container);

      root = createRoot(container);
      flushSync(() => {
        root?.render(
          <LanguageProvider defaultLang={lang}>
            <CardEditor
              draft={testCard}
              setDraft={() => {}}
              userId="user-test-1"
              isNew={false}
              onSaved={() => {}}
            />
          </LanguageProvider>,
        );
      });
      await nextPaint();

      const contactBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="editor-section-nav"] button[data-section-id="contact"]',
      );
      expect(contactBtn).not.toBeNull();

      contactBtn?.click();
      await nextPaint();

      expect(contactBtn?.getAttribute("aria-current")).toBe("true");

      const styleBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="editor-section-nav"] button[data-section-id="style"]',
      );
      expect(styleBtn).not.toBeNull();

      styleBtn?.click();
      await nextPaint();

      expect(styleBtn?.getAttribute("aria-current")).toBe("true");

      root?.unmount();
      container.remove();
    }
  });
});
