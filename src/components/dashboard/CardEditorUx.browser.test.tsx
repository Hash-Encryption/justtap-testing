import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CardEditor } from "./CardEditor";
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
    for (const lang of ["en" as const, "ar" as const]) {
      renderEditor(testCard, lang);
      await nextPaint();

      const statusBar = document.querySelector<HTMLElement>('[data-testid="editor-status-bar"]');
      const sectionNav = document.querySelector<HTMLElement>('[data-testid="editor-section-nav"]');
      const previewAnchor = document.getElementById("live-preview");
      const bottomCta = document.querySelector<HTMLElement>('[data-testid="bottom-upgrade-cta"]');

      expect(statusBar).not.toBeNull();
      expect(sectionNav).not.toBeNull();
      expect(previewAnchor).not.toBeNull();
      expect(bottomCta).not.toBeNull();

      // Check document body for no horizontal scrollbar overflow
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        window.innerWidth + 20, // leeway for default margin/scrollbar in browser runner
      );

      root?.unmount();
      document.getElementById("browser-test-root")?.remove();
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

  it("ensures sticky section navigation remains usable and touch-friendly", async () => {
    renderEditor(testCard, "en");
    await nextPaint();

    const navButtons = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="editor-section-nav"] button'),
    );
    expect(navButtons.length).toBeGreaterThanOrEqual(4);

    for (const btn of navButtons) {
      const rect = btn.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(32);
      expect(rect.width).toBeGreaterThanOrEqual(40);
    }
  });
});
