import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import "@/styles.css";

let root: Root | undefined;

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

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

describe("AnalyticsTab Component — Browser & Mobile Regression", () => {
  it("renders Free tier Pro Preview with sample data and upgrade CTA when isPro is false", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <AnalyticsTab cardId="card-1" isPro={false} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    expect(document.body.textContent).toMatch(/PRO PREVIEW · SAMPLE DATA|معاينة PRO/i);
    expect(document.body.textContent).toMatch(/Unlock Your Analytics|فتح إحصائياتك/i);
    expect(document.body.textContent).toMatch(/Profile Activity|نشاط الملف/i);
    expect(document.body.textContent).toMatch(/Traffic Sources|مصادر الزيارات/i);
    expect(document.body.textContent).not.toMatch(/Analytics is a Pro feature/i);
  });

  it("renders Pro analytics shell on narrow mobile viewport (320px) without horizontal overflow", async () => {
    const host = document.createElement("div");
    host.style.width = "320px";
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <AnalyticsTab cardId="card-1" isPro={true} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth || 320);
    expect(document.body.textContent).not.toContain("SQL");
    expect(document.body.textContent).not.toContain("PGRST");
  });

  it("renders Free analytics preview shell on narrow mobile viewport (320px) without horizontal overflow", async () => {
    const host = document.createElement("div");
    host.style.width = "320px";
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <AnalyticsTab cardId="card-1" isPro={false} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth || 320);
    expect(document.body.textContent).not.toContain("SQL");
    expect(document.body.textContent).not.toContain("PGRST");
  });
});
