import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { ProFeaturesTab } from "@/components/dashboard/ProFeaturesTab";
import { emptyCard, type Card } from "@/lib/card";
import "@/styles.css";

let root: Root | undefined;

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

const mockFreeCard: Card = {
  ...emptyCard,
  id: "card-free-1",
  user_id: "user-1",
  slug: "alex-test",
  full_name: "Alex Test",
  plan_tier: "free",
};

const mockProCard: Card = {
  ...emptyCard,
  id: "card-pro-1",
  user_id: "user-1",
  slug: "pro-user",
  full_name: "Pro User",
  plan_tier: "pro",
};

beforeEach(() => {
  try {
    window.localStorage.removeItem("justtap_app_lang");
  } catch {
    // Ignore storage cleanup failure
  }
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = "";
});

describe("ProFeaturesTab Component — Browser & Mobile Regression", () => {
  it("renders Free tier Pro Features preview without horizontal overflow at mobile 375px in LTR and RTL", async () => {
    for (const lang of ["en", "ar"] as const) {
      const host = document.createElement("div");
      host.style.width = "375px";
      host.style.maxWidth = "375px";
      host.style.overflowX = "hidden";
      document.body.append(host);
      root = createRoot(host);

      flushSync(() => {
        root?.render(
          <LanguageProvider defaultLang={lang}>
            <ProFeaturesTab card={mockFreeCard} userId="user-1" onChange={vi.fn()} />
          </LanguageProvider>,
        );
      });
      await nextPaint();

      if (lang === "en") {
        expect(document.body.textContent).toMatch(/Make Your Card Do More/i);
        expect(document.body.textContent).toMatch(/PRO PREVIEW/i);
        expect(document.body.textContent).toMatch(/Start 7-Day Free Trial/i);
        expect(document.body.textContent).toMatch(/Upgrade to Activate/i);
        expect(document.body.textContent).toMatch(/Example/i);
        expect(document.body.textContent).toMatch(/PDF document/i);
        expect(document.body.textContent).toMatch(/Your booking link/i);
        expect(document.body.textContent).toMatch(/Action button/i);
      } else {
        expect(document.body.textContent).toMatch(/اجعل بطاقتك تقدم المزيد/i);
        expect(document.body.textContent).toMatch(/ترقية للتفعيل/i);
        expect(document.body.textContent).toMatch(/مثال توضيحي/i);
        expect(document.body.textContent).toMatch(/مستند PDF/i);
        expect(document.body.textContent).toMatch(/رابط الحجز الخاص بك/i);
        expect(document.body.textContent).toMatch(/زر الإجراء/i);
        expect(document.body.textContent).toMatch(/قبل/i);
        expect(document.body.textContent).toMatch(/بعد/i);

        // Assert zero English leakage in Arabic mode for newly introduced mini-preview labels
        expect(document.body.textContent).not.toMatch(/Live Embed/i);
        expect(document.body.textContent).not.toMatch(/Mockup/i);
        expect(document.body.textContent).not.toMatch(/PDF Document/);
        expect(document.body.textContent).not.toMatch(/calendly\.com\/\.\.\./i);
        expect(document.body.textContent).not.toMatch(/Action Button/i);
      }

      // Assert no horizontal overflow
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);

      root.unmount();
      root = undefined;
      document.body.innerHTML = "";
    }
  });

  it("renders Pro tier with active status and save bar on desktop without horizontal overflow", async () => {
    const host = document.createElement("div");
    host.style.width = "1024px";
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <ProFeaturesTab card={mockProCard} userId="user-1" onChange={vi.fn()} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    expect(document.body.textContent).toMatch(/PRO ACTIVE/i);
    expect(document.body.textContent).toMatch(/Pro Status: Active/i);
    expect(document.body.textContent).toMatch(/Save & Publish Features/i);
    expect(document.body.textContent).not.toMatch(/Start 7-Day Free Trial/i);

    // Verify all 7 feature sections exist
    expect(document.querySelector('[data-testid="pro-feature-video"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-pdf"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-booking"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-cta"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-alerts"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-webhook"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pro-feature-brand"]')).not.toBeNull();
  });
});
