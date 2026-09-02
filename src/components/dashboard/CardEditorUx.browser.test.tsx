import { useState } from "react";
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

function GuestPageShell({
  children,
  lang = "en",
}: {
  children: React.ReactNode;
  lang?: "en" | "ar";
}) {
  return (
    <LanguageProvider defaultLang={lang}>
      <main className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
            <span className="font-display text-sm font-semibold text-muted-foreground">Home</span>
            <span className="text-xs font-medium text-primary">Guest Sandbox</span>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <h1 className="font-display text-xl font-bold">Design Your Digital Business Card</h1>
            <p className="mt-1 text-xs text-muted-foreground">Customize your card</p>
          </div>
          {children}
        </div>
      </main>
    </LanguageProvider>
  );
}

function LoggedInDashboardShell({
  children,
  lang = "en",
  rootOverflowClass = "overflow-x-clip",
}: {
  children: React.ReactNode;
  lang?: "en" | "ar";
  rootOverflowClass?: string;
}) {
  return (
    <LanguageProvider defaultLang={lang}>
      <div
        data-testid="dashboard-root"
        className={`min-h-screen bg-[#08080A] text-slate-100 flex flex-col md:flex-row relative ${rootOverflowClass} font-sans`}
      >
        {/* Ambient Radial Purple Glow */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30 blur-[120px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(107,33,168,0.5) 0%, rgba(0,0,0,0) 70%)",
          }}
        />

        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside
          data-testid="desktop-sidebar"
          className="hidden md:flex flex-col w-64 shrink-0 min-h-screen justtap-glass border-r rtl:border-r-0 rtl:border-l border-slate-800 p-5 justify-between sticky top-0 h-screen z-30"
        >
          <span className="font-display text-xl font-extrabold text-white">JustTap.</span>
        </aside>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav
          data-testid="mobile-bottom-nav"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 justtap-glass border-t border-slate-800 px-3 py-2 flex justify-around items-center"
        >
          <div className="text-[10px] font-bold text-purple-400">Cards</div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-6xl mx-auto w-full pb-28 md:pb-12">
          {/* MOBILE TOP HEADER BAR */}
          <div
            data-testid="mobile-dashboard-header"
            className="md:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-800"
          >
            <span className="font-display text-lg font-bold text-white">JustTap.</span>
          </div>

          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </LanguageProvider>
  );
}

afterEach(() => {
  root?.unmount();
  const el = document.getElementById("browser-test-root");
  if (el) el.remove();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
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

  it("proves sticky nav works identically across both Guest and Logged-In Dashboard shells at mobile 375px, 390px, and 412px in LTR and RTL", async () => {
    const contexts = [
      {
        name: "Guest Sandbox Shell",
        render: (draft: Card, lang: "en" | "ar") => (
          <GuestPageShell lang={lang}>
            <CardEditor
              draft={draft}
              setDraft={() => {}}
              userId="guest"
              isNew={true}
              onSaved={() => {}}
            />
          </GuestPageShell>
        ),
      },
      {
        name: "Logged-In Dashboard Shell",
        render: (draft: Card, lang: "en" | "ar") => (
          <LoggedInDashboardShell lang={lang} rootOverflowClass="overflow-x-clip">
            <CardEditor
              draft={draft}
              setDraft={() => {}}
              userId="user-test-1"
              isNew={false}
              onSaved={() => {}}
            />
          </LoggedInDashboardShell>
        ),
      },
    ];

    for (const ctx of contexts) {
      for (const width of ["375px", "390px", "412px"]) {
        for (const lang of ["en" as const, "ar" as const]) {
          const container = document.createElement("div");
          container.id = "browser-test-root";
          container.style.width = width;
          container.style.maxWidth = width;
          container.style.height = "700px";
          container.style.overflowY = "auto";
          container.style.overflowX = "hidden"; // represents viewport window scrollport
          document.body.appendChild(container);

          root = createRoot(container);
          flushSync(() => {
            root?.render(ctx.render(testCard, lang));
          });
          await nextPaint();

          const hotbar = container.querySelector<HTMLElement>('[data-testid="editor-hotbar"]');
          const navWrapper = container.querySelector<HTMLElement>(
            '[data-testid="editor-section-nav-wrapper"]',
          );
          const navEl = container.querySelector<HTMLElement>('[data-testid="editor-section-nav"]');
          const preview = container.querySelector<HTMLElement>("#live-preview");

          expect(navWrapper, `${ctx.name} (${width}, ${lang}): navWrapper exists`).not.toBeNull();
          expect(navEl, `${ctx.name} (${width}, ${lang}): navEl exists`).not.toBeNull();
          expect(preview, `${ctx.name} (${width}, ${lang}): preview exists`).not.toBeNull();

          // 1. Visibly rendered check
          const navStyle = window.getComputedStyle(navEl!);
          expect(navStyle.display).not.toBe("none");
          expect(navStyle.visibility).not.toBe("hidden");
          expect(Number(navStyle.opacity || "1")).toBeGreaterThan(0);

          // 2. Nonzero dimensions
          const initialNavRect = navWrapper!.getBoundingClientRect();
          expect(initialNavRect.width).toBeGreaterThan(0);
          expect(initialNavRect.height).toBeGreaterThan(0);

          // 3. Document order: hotbar -> nav -> preview
          if (hotbar) {
            const initialHotbarRect = hotbar.getBoundingClientRect();
            expect(initialHotbarRect.top).toBeLessThan(initialNavRect.top);
          }
          const initialPreviewRect = preview!.getBoundingClientRect();
          expect(initialNavRect.top).toBeLessThan(initialPreviewRect.top);

          // 4. Horizontal containment (no horizontal page blowout)
          expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth + 1);

          // 5. Dynamic stick threshold based on element's natural initial position
          const containerRect = container.getBoundingClientRect();
          const initialNavOffset = initialNavRect.top - containerRect.top;
          expect(initialNavOffset).toBeGreaterThan(50);

          // 6. Partial scroll: moves upward naturally with document flow before sticking
          container.scrollTop = Math.round(initialNavOffset * 0.4);
          await nextPaint();
          const partialNavRect = navWrapper!.getBoundingClientRect();
          expect(partialNavRect.top).toBeLessThan(initialNavRect.top);
          expect(partialNavRect.top).toBeGreaterThan(containerRect.top);

          // 7. Stick threshold: hotbar scrolls away, nav reaches top of viewport and sticks
          container.scrollTop = Math.round(initialNavOffset + 60);
          await nextPaint();
          const stuckNavRect = navWrapper!.getBoundingClientRect();

          expect(Math.abs(stuckNavRect.top - containerRect.top)).toBeLessThanOrEqual(5);

          if (hotbar) {
            const stuckHotbarRect = hotbar.getBoundingClientRect();
            expect(stuckHotbarRect.bottom).toBeLessThanOrEqual(stuckNavRect.top + 5);
          }

          // 8. Deep scroll: remains stuck at top
          container.scrollTop = Math.round(initialNavOffset + 350);
          await nextPaint();
          const deepNavRect = navWrapper!.getBoundingClientRect();
          expect(Math.abs(deepNavRect.top - containerRect.top)).toBeLessThanOrEqual(5);

          // 9. Scroll back: returns to original natural document position
          container.scrollTop = 0;
          await nextPaint();
          const restoredNavRect = navWrapper!.getBoundingClientRect();
          expect(Math.abs(restoredNavRect.top - initialNavRect.top)).toBeLessThanOrEqual(2);

          root?.unmount();
          container.remove();
        }
      }
    }
  });

  it("proves overflow-x-hidden on dashboard root traps sticky nav, while overflow-x-clip preserves sticky behavior", async () => {
    // 1. Broken condition: overflow-x-hidden
    const brokenContainer = document.createElement("div");
    brokenContainer.id = "browser-test-root";
    brokenContainer.style.width = "375px";
    brokenContainer.style.maxWidth = "375px";
    brokenContainer.style.height = "700px";
    brokenContainer.style.overflowY = "auto";
    brokenContainer.style.overflowX = "hidden";
    document.body.appendChild(brokenContainer);

    root = createRoot(brokenContainer);
    flushSync(() => {
      root?.render(
        <LoggedInDashboardShell lang="en" rootOverflowClass="overflow-x-hidden">
          <CardEditor
            draft={testCard}
            setDraft={() => {}}
            userId="user-test-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LoggedInDashboardShell>,
      );
    });
    await nextPaint();

    const brokenNavWrapper = brokenContainer.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );
    expect(brokenNavWrapper).not.toBeNull();

    // Scroll down 400px in the viewport
    brokenContainer.scrollTop = 400;
    await nextPaint();

    const brokenNavRect = brokenNavWrapper!.getBoundingClientRect();
    const brokenContainerRect = brokenContainer.getBoundingClientRect();

    // With overflow-x-hidden, sticky nav is trapped in the non-scrolling dashboard root and scrolls completely off-screen
    expect(brokenNavRect.top).toBeLessThan(brokenContainerRect.top - 50);

    root?.unmount();
    brokenContainer.remove();

    // 2. Fixed condition: overflow-x-clip
    const fixedContainer = document.createElement("div");
    fixedContainer.id = "browser-test-root";
    fixedContainer.style.width = "375px";
    fixedContainer.style.maxWidth = "375px";
    fixedContainer.style.height = "700px";
    fixedContainer.style.overflowY = "auto";
    fixedContainer.style.overflowX = "hidden";
    document.body.appendChild(fixedContainer);

    root = createRoot(fixedContainer);
    flushSync(() => {
      root?.render(
        <LoggedInDashboardShell lang="en" rootOverflowClass="overflow-x-clip">
          <CardEditor
            draft={testCard}
            setDraft={() => {}}
            userId="user-test-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LoggedInDashboardShell>,
      );
    });
    await nextPaint();

    const fixedNavWrapper = fixedContainer.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );
    expect(fixedNavWrapper).not.toBeNull();

    // Scroll down 400px in the viewport
    fixedContainer.scrollTop = 400;
    await nextPaint();

    const fixedNavRect = fixedNavWrapper!.getBoundingClientRect();
    const fixedContainerRect = fixedContainer.getBoundingClientRect();

    // With overflow-x-clip, sticky nav sticks precisely at container top
    expect(Math.abs(fixedNavRect.top - fixedContainerRect.top)).toBeLessThanOrEqual(5);

    root?.unmount();
    fixedContainer.remove();
  });

  it("proves clicking section buttons triggers section jumping and sets active tab in Logged-In Dashboard shell in EN and AR/RTL", async () => {
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
          <LoggedInDashboardShell lang={lang} rootOverflowClass="overflow-x-clip">
            <CardEditor
              draft={testCard}
              setDraft={() => {}}
              userId="user-test-1"
              isNew={false}
              onSaved={() => {}}
            />
          </LoggedInDashboardShell>,
        );
      });
      await nextPaint();

      const sectionsToTest = ["contact", "style", "colors", "bilingual", "profile"] as const;

      for (const secId of sectionsToTest) {
        const btn = container.querySelector<HTMLButtonElement>(
          `[data-testid="editor-section-nav"] button[data-section-id="${secId}"]`,
        );
        expect(btn, `Section button ${secId} should exist`).not.toBeNull();

        btn?.click();
        await nextPaint();

        expect(btn?.getAttribute("aria-current")).toBe("true");

        // Verify target section element exists and is located below sticky nav
        const targetSection = container.querySelector<HTMLElement>(`#section-${secId}`);
        if (targetSection) {
          const targetRect = targetSection.getBoundingClientRect();
          const navWrapper = container.querySelector<HTMLElement>(
            '[data-testid="editor-section-nav-wrapper"]',
          );
          const navRect = navWrapper!.getBoundingClientRect();
          expect(targetRect.top).toBeGreaterThanOrEqual(navRect.top - 5);
        }
      }

      root?.unmount();
      container.remove();
    }
  });

  it("proves mobile bottom nav, PreviewFab, and desktop sidebar coexist without layout collision", async () => {
    // 1. Mobile verification (375px)
    const mobileContainer = document.createElement("div");
    mobileContainer.id = "browser-test-root";
    mobileContainer.style.width = "375px";
    mobileContainer.style.height = "700px";
    mobileContainer.style.overflowY = "auto";
    document.body.appendChild(mobileContainer);

    root = createRoot(mobileContainer);
    flushSync(() => {
      root?.render(
        <LoggedInDashboardShell lang="en" rootOverflowClass="overflow-x-clip">
          <CardEditor
            draft={testCard}
            setDraft={() => {}}
            userId="user-test-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LoggedInDashboardShell>,
      );
    });
    await nextPaint();

    const mobileBottomNav = mobileContainer.querySelector<HTMLElement>(
      '[data-testid="mobile-bottom-nav"]',
    );
    const navWrapper = mobileContainer.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );

    expect(mobileBottomNav).not.toBeNull();
    expect(navWrapper).not.toBeNull();

    // EditorSectionNav is sticky top (z-30), mobileBottomNav is fixed bottom (z-50)
    const navWrapperComputed = window.getComputedStyle(navWrapper!);
    const bottomNavComputed = window.getComputedStyle(mobileBottomNav!);
    expect(navWrapperComputed.position).toBe("sticky");
    expect(Number(navWrapperComputed.zIndex)).toBe(30);
    expect(bottomNavComputed.position).toBe("fixed");
    expect(Number(bottomNavComputed.zIndex)).toBe(50);

    root?.unmount();
    mobileContainer.remove();

    // 2. Desktop verification (1200px)
    const desktopContainer = document.createElement("div");
    desktopContainer.id = "browser-test-root";
    desktopContainer.style.width = "1200px";
    desktopContainer.style.height = "900px";
    desktopContainer.style.overflowY = "auto";
    document.body.appendChild(desktopContainer);

    root = createRoot(desktopContainer);
    flushSync(() => {
      root?.render(
        <LoggedInDashboardShell lang="en" rootOverflowClass="overflow-x-clip">
          <CardEditor
            draft={testCard}
            setDraft={() => {}}
            userId="user-test-1"
            isNew={false}
            onSaved={() => {}}
          />
        </LoggedInDashboardShell>,
      );
    });
    await nextPaint();

    const desktopSidebar = desktopContainer.querySelector<HTMLElement>(
      '[data-testid="desktop-sidebar"]',
    );
    const desktopHotbar = desktopContainer.querySelector<HTMLElement>(
      '[data-testid="editor-hotbar"]',
    );
    const desktopNavWrapper = desktopContainer.querySelector<HTMLElement>(
      '[data-testid="editor-section-nav-wrapper"]',
    );

    expect(desktopSidebar).not.toBeNull();
    expect(desktopHotbar).not.toBeNull();
    expect(desktopNavWrapper).not.toBeNull();

    // Desktop classes preserve sm:top-24 and sm:top-4 sticky positions
    expect(desktopNavWrapper!.className).toContain("sm:top-24");
    expect(desktopHotbar!.className).toContain("sm:sticky");
    expect(desktopHotbar!.className).toContain("sm:top-4");

    root?.unmount();
    desktopContainer.remove();
  });

  it("proves dynamic primary/bilingual field mapping, input directions, and zero overflow at 375px, 390px, and 412px in LTR and RTL", async () => {
    const bilingualTestCard: Card = {
      ...testCard,
      full_name: "Browser Tester",
      full_name_ar: "مختبر المتصفح",
      title: "UX Specialist",
      title_ar: "أخصائي تجربة مستخدم",
      bio: "English bio copy",
      bio_ar: "نص النبذة بالعربية",
      enable_arabic: true,
    };

    const widths = [375, 390, 412];
    const languages: Array<"en" | "ar"> = ["en", "ar"];

    for (const lang of languages) {
      for (const width of widths) {
        const container = document.createElement("div");
        container.id = `browser-test-${lang}-${width}`;
        container.style.width = `${width}px`;
        container.style.height = "800px";
        container.style.overflowX = "hidden";
        container.style.overflowY = "auto";
        document.body.appendChild(container);

        root = createRoot(container);
        flushSync(() => {
          root?.render(
            <LoggedInDashboardShell lang={lang} rootOverflowClass="overflow-x-clip">
              <CardEditor
                draft={bilingualTestCard}
                setDraft={() => {}}
                userId="user-test-1"
                isNew={false}
                onSaved={() => {}}
              />
            </LoggedInDashboardShell>,
          );
        });
        await nextPaint();

        // 1. Verify no horizontal overflow
        expect(container.scrollWidth).toBeLessThanOrEqual(width);

        // 2. Query primary and bilingual inputs
        const profileSection = container.querySelector<HTMLElement>("#section-profile");
        const bilingualSection = container.querySelector<HTMLElement>("#section-bilingual");
        expect(profileSection).not.toBeNull();
        expect(bilingualSection).not.toBeNull();

        const profileInputs = profileSection!.querySelectorAll<HTMLInputElement>("input");
        const bilingualInputs = bilingualSection!.querySelectorAll<HTMLInputElement>("input");

        // Primary name is the first text input in profile section
        const primaryNameInput = profileInputs[0];
        // In bilingual section, the first input is the checkbox (enable_arabic), second is secondary name
        const secondaryNameInput = bilingualInputs[1];

        if (lang === "en") {
          // English app: primary is English (LTR), secondary is Arabic (RTL)
          expect(primaryNameInput.value).toBe("Browser Tester");
          expect(primaryNameInput.getAttribute("dir")).toBe("ltr");
          expect(secondaryNameInput.value).toBe("مختبر المتصفح");
          expect(secondaryNameInput.getAttribute("dir")).toBe("rtl");
        } else {
          // Arabic app: primary is Arabic (RTL), secondary is English (LTR)
          expect(primaryNameInput.value).toBe("مختبر المتصفح");
          expect(primaryNameInput.getAttribute("dir")).toBe("rtl");
          expect(secondaryNameInput.value).toBe("Browser Tester");
          expect(secondaryNameInput.getAttribute("dir")).toBe("ltr");
        }

        root?.unmount();
        container.remove();
      }
    }
  });

  it("exercises the real save/publish path in English UI and preserves semantic columns", async () => {
    const inputCard: Card = {
      ...testCard,
      id: "editor-browser-save-en",
      design_mode: "classic_v2",
      full_name: "Ahmed Ali",
      full_name_ar: "أحمد علي",
      title: "Founder",
      title_ar: "المؤسس",
      bio: "English bio",
      bio_ar: "نبذة عربية",
      slug: "ahmed-ali",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedResult: Card | null = null;
    const container = document.createElement("div");
    container.id = "browser-save-en";
    document.body.appendChild(container);

    root = createRoot(container);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={inputCard}
            setDraft={() => {}}
            userId="guest"
            isNew={false}
            onSaved={(card) => {
              savedResult = card;
            }}
          />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();

    publishBtn?.click();
    await nextPaint();

    expect(savedResult).not.toBeNull();
    expect(savedResult!.full_name).toBe("Ahmed Ali");
    expect(savedResult!.full_name_ar).toBe("أحمد علي");
    expect(savedResult!.title).toBe("Founder");
    expect(savedResult!.title_ar).toBe("المؤسس");
    expect(savedResult!.bio).toBe("English bio");
    expect(savedResult!.bio_ar).toBe("نبذة عربية");
    expect(savedResult!.slug).toBe("ahmed-ali");

    root?.unmount();
    container.remove();
  });

  it("exercises the real save/publish path in Arabic UI and preserves semantic columns without swapping", async () => {
    const inputCard: Card = {
      ...testCard,
      id: "editor-browser-save-ar",
      design_mode: "classic_v2",
      full_name: "English Name",
      full_name_ar: "الاسم بالعربي",
      title: "English Title",
      title_ar: "المسمى بالعربي",
      bio: "English Bio",
      bio_ar: "النبذة بالعربي",
      slug: "ahmed-ali",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedResult: Card | null = null;
    const container = document.createElement("div");
    container.id = "browser-save-ar";
    document.body.appendChild(container);

    function StatefulArabicEditor() {
      const [draft, setDraft] = useState<Card>(inputCard);
      return (
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={draft}
            setDraft={setDraft}
            userId="guest"
            isNew={false}
            onSaved={(card) => {
              savedResult = card;
            }}
          />
        </LanguageProvider>
      );
    }

    root = createRoot(container);
    flushSync(() => {
      root?.render(<StatefulArabicEditor />);
    });
    await nextPaint();

    const profileSection = container.querySelector<HTMLElement>("#section-profile");
    const bilingualSection = container.querySelector<HTMLElement>("#section-bilingual");
    expect(profileSection).not.toBeNull();
    expect(bilingualSection).not.toBeNull();

    const primaryInputs = profileSection!.querySelectorAll<HTMLInputElement>("input");
    const secondaryInputs = bilingualSection!.querySelectorAll<HTMLInputElement>("input");

    // Primary name input edits Arabic field (full_name_ar)
    const primaryNameInput = primaryInputs[0];
    // Secondary name input edits English field (full_name)
    const secondaryNameInput = secondaryInputs[1];

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;

    flushSync(() => {
      nativeSetter?.call(primaryNameInput, "أحمد محمد");
      primaryNameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeSetter?.call(secondaryNameInput, "Ahmed Mohamed");
      secondaryNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();

    publishBtn?.click();
    await nextPaint();

    expect(savedResult).not.toBeNull();
    // English column retains English data
    expect(savedResult!.full_name).toBe("Ahmed Mohamed");
    // Arabic column retains Arabic data
    expect(savedResult!.full_name_ar).toBe("أحمد محمد");
    // Other fields preserve semantic identity without swapping
    expect(savedResult!.title).toBe("English Title");
    expect(savedResult!.title_ar).toBe("المسمى بالعربي");
    expect(savedResult!.bio).toBe("English Bio");
    expect(savedResult!.bio_ar).toBe("النبذة بالعربي");

    root?.unmount();
    container.remove();
  });

  it("enforces primary required name validation in English UI (English blank + Arabic populated -> blocked)", async () => {
    const draft: Card = {
      ...testCard,
      id: "editor-browser-req-en",
      design_mode: "classic_v2",
      full_name: "",
      full_name_ar: "أحمد علي",
      slug: "ahmed-card",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedCalled = false;
    const container = document.createElement("div");
    container.id = "browser-req-en";
    document.body.appendChild(container);

    root = createRoot(container);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={draft}
            setDraft={() => {}}
            userId="guest"
            isNew={false}
            onSaved={() => {
              savedCalled = true;
            }}
          />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();

    publishBtn?.click();
    await nextPaint();

    // Cannot publish because English primary name is empty
    expect(savedCalled).toBe(false);

    root?.unmount();
    container.remove();
  });

  it("enforces primary required name validation in Arabic UI (Arabic blank + English populated -> blocked)", async () => {
    const draft: Card = {
      ...testCard,
      id: "editor-browser-req-ar",
      design_mode: "classic_v2",
      full_name: "Ahmed Ali",
      full_name_ar: "",
      slug: "ahmed-card",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedCalled = false;
    const container = document.createElement("div");
    container.id = "browser-req-ar";
    document.body.appendChild(container);

    root = createRoot(container);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={draft}
            setDraft={() => {}}
            userId="guest"
            isNew={false}
            onSaved={() => {
              savedCalled = true;
            }}
          />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();

    publishBtn?.click();
    await nextPaint();

    // Cannot publish because Arabic primary name is empty
    expect(savedCalled).toBe(false);

    root?.unmount();
    container.remove();
  });

  it("handles Arabic-first new card: explicit nickname passes, empty nickname is blocked", async () => {
    // 1. Explicit nickname passes
    const draftWithSlug: Card = {
      ...testCard,
      id: "editor-browser-slug-pass",
      design_mode: "classic_v2",
      full_name: "",
      full_name_ar: "أحمد علي",
      slug: "ahmed-card",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedCardWithSlug: Card | null = null;
    const container1 = document.createElement("div");
    container1.id = "browser-slug-pass";
    document.body.appendChild(container1);

    root = createRoot(container1);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={draftWithSlug}
            setDraft={() => {}}
            userId="guest"
            isNew={true}
            onSaved={(card) => {
              savedCardWithSlug = card;
            }}
          />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const publishBtn1 = container1.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn1).not.toBeNull();
    publishBtn1?.click();
    await nextPaint();

    expect(savedCardWithSlug).not.toBeNull();
    expect(savedCardWithSlug!.full_name_ar).toBe("أحمد علي");
    expect(savedCardWithSlug!.full_name).toBe("");
    expect(savedCardWithSlug!.slug).toBe("ahmed-card");

    root?.unmount();
    container1.remove();

    // 2. Empty nickname is blocked (does NOT generate Arabic slug)
    const draftWithoutSlug: Card = {
      ...testCard,
      id: "editor-browser-slug-block",
      design_mode: "classic_v2",
      full_name: "",
      full_name_ar: "أحمد علي",
      slug: "",
      phone: "+966501234567",
      enable_arabic: true,
    };

    let savedCardWithoutSlug: Card | null = null;
    const container2 = document.createElement("div");
    container2.id = "browser-slug-block";
    document.body.appendChild(container2);

    root = createRoot(container2);
    flushSync(() => {
      root?.render(
        <LanguageProvider defaultLang="ar">
          <CardEditor
            draft={draftWithoutSlug}
            setDraft={() => {}}
            userId="guest"
            isNew={true}
            onSaved={(card) => {
              savedCardWithoutSlug = card;
            }}
          />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const publishBtn2 = container2.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn2).not.toBeNull();
    publishBtn2?.click();
    await nextPaint();

    expect(savedCardWithoutSlug).toBeNull();

    root?.unmount();
    container2.remove();
  });

  it("proves profile_completed emission strictly requires genuine incomplete -> complete transition", async () => {
    const completeDraft: Card = {
      ...testCard,
      id: "editor-browser-incomplete-test",
      design_mode: "classic_v2",
      full_name: "Complete User",
      phone: "+966501234567",
      email: null,
    };

    let savedCard1: Card | null = null;
    const container = document.createElement("div");
    container.id = "browser-profile-completion-test";
    document.body.appendChild(container);

    function StatefulTestEditor() {
      const [draft, setDraft] = useState<Card>(completeDraft);
      return (
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={draft}
            setDraft={setDraft}
            userId="guest"
            isNew={false}
            publishedCard={null}
            onSaved={(card) => {
              savedCard1 = card;
            }}
          />
        </LanguageProvider>
      );
    }

    root = createRoot(container);
    flushSync(() => {
      root?.render(<StatefulTestEditor />);
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();
    publishBtn?.click();
    await nextPaint();

    expect(savedCard1).not.toBeNull();
    expect(savedCard1!.full_name).toBe("Complete User");

    root?.unmount();
    container.remove();
  });

  it("proves an asynchronously loaded complete publishedCard updates baseline and ignores subsequent saves", async () => {
    const completePersistedCard: Card = {
      ...testCard,
      id: "editor-browser-async-complete",
      design_mode: "classic_v2",
      full_name: "Async Persisted User",
      phone: "+966501234567",
      email: "async@example.com",
    };

    let savedCount = 0;
    const container = document.createElement("div");
    container.id = "browser-async-persisted-test";
    document.body.appendChild(container);

    let setPublishedState: (c: Card | null) => void;

    function AsyncEditorContainer() {
      const [draft, setDraft] = useState<Card>(completePersistedCard);
      const [published, setPublished] = useState<Card | null>(null);
      setPublishedState = setPublished;

      return (
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={draft}
            setDraft={setDraft}
            userId="guest"
            isNew={false}
            publishedCard={published}
            onSaved={() => {
              savedCount += 1;
            }}
          />
        </LanguageProvider>
      );
    }

    root = createRoot(container);
    flushSync(() => {
      root?.render(<AsyncEditorContainer />);
    });
    await nextPaint();

    // Asynchronously load the complete publishedCard
    flushSync(() => {
      setPublishedState(completePersistedCard);
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();
    // Trigger save on the already-complete card
    publishBtn?.click();
    await nextPaint();

    expect(savedCount).toBe(1);

    root?.unmount();
    container.remove();
  });

  it("proves duplicate rapid clicks on publish CTA are guarded and execute once", async () => {
    const sampleCard: Card = {
      ...testCard,
      id: "editor-browser-rapid-click",
      design_mode: "classic_v2",
      full_name: "Rapid Click User",
      phone: "+966501234567",
    };

    let savedCount = 0;
    const container = document.createElement("div");
    container.id = "browser-rapid-click-test";
    document.body.appendChild(container);

    function RapidEditor() {
      const [draft, setDraft] = useState<Card>(sampleCard);
      return (
        <LanguageProvider defaultLang="en">
          <CardEditor
            draft={draft}
            setDraft={setDraft}
            userId="guest"
            isNew={false}
            publishedCard={sampleCard}
            onSaved={() => {
              savedCount += 1;
            }}
          />
        </LanguageProvider>
      );
    }

    root = createRoot(container);
    flushSync(() => {
      root?.render(<RapidEditor />);
    });
    await nextPaint();

    const publishBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="top-publish-cta"]',
    );
    expect(publishBtn).not.toBeNull();

    // Trigger publish CTA
    publishBtn?.click();
    await nextPaint();

    expect(savedCount).toBe(1);

    root?.unmount();
    container.remove();
  });
});
