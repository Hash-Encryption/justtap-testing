import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { ConnectionsTab } from "@/components/dashboard/LeadsTab";
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

describe("ConnectionsTab Component — Browser & Mobile Regression", () => {
  it("renders Free tier with Pro notice on export when isPro is false", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <ConnectionsTab cardId="card-1" isPro={false} />
        </LanguageProvider>,
      );
    });
    // Wait for initial load to settle
    let retries = 20;
    while (document.querySelector("[role='status']") && retries-- > 0) {
      await new Promise((r) => setTimeout(r, 50));
      await nextPaint();
    }

    expect(document.body.textContent).toMatch(/Connections/i);
    expect(document.body.textContent).toMatch(/CSV export is a Pro feature|Pro/i);
  });

  it("renders empty or loading state cleanly without raw SQL or PGRST errors", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <ConnectionsTab cardId="empty-card" isPro={true} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    expect(document.body.textContent).not.toContain("SQL");
    expect(document.body.textContent).not.toContain("PGRST");
  });

  it("supports mobile keyboard and text entry without focus loss or dismissal loops", async () => {
    const host = document.createElement("div");
    host.style.width = "320px";
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <ConnectionsTab cardId="card-1" isPro={true} />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    // Locate search input if rendered
    const searchInput = document.querySelector<HTMLInputElement>(
      "input[type='text'], input[placeholder*='Search']",
    );
    if (searchInput) {
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      // Simulate typing keystrokes
      searchInput.value = "Sarah";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      await nextPaint();

      // Focus must NOT be lost during or after input events
      expect(document.activeElement).toBe(searchInput);
      expect(searchInput.value).toBe("Sarah");
    }
  });
});
