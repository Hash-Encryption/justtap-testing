import { describe, expect, it } from "vitest";
import { formatLocalizedRelativeTime, formatLocalizedPeakDate } from "../i18n";
import fs from "node:fs";
import path from "node:path";

describe("Whole-App Internationalization (i18n) & Arabic Support", () => {
  it("verifies relative date formatting in Arabic and English", () => {
    const now = new Date().toISOString();
    expect(formatLocalizedRelativeTime(now, "en")).toBe("Just now");
    expect(formatLocalizedRelativeTime(now, "ar")).toBe("الآن");

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLocalizedRelativeTime(twoDaysAgo, "en")).toBe("2d ago");
    expect(formatLocalizedRelativeTime(twoDaysAgo, "ar")).toBe("منذ 2 ي");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatLocalizedRelativeTime(twoHoursAgo, "en")).toBe("2h ago");
    expect(formatLocalizedRelativeTime(twoHoursAgo, "ar")).toBe("منذ 2 س");

    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(formatLocalizedRelativeTime(twoMinsAgo, "en")).toBe("2m ago");
    expect(formatLocalizedRelativeTime(twoMinsAgo, "ar")).toBe("منذ 2 د");
  });

  it("verifies peak date formatting in Arabic and English", () => {
    const peak = "2026-08-15";
    const en = formatLocalizedPeakDate(peak, "en");
    expect(en.formattedDate).toContain("August");
    expect(en.dayOfWeek).toBe("Saturday");

    const ar = formatLocalizedPeakDate(peak, "ar");
    expect(ar.dayOfWeek).toBe("السبت");
  });

  it("verifies i18n file contains 1-to-1 matching keys in EN and AR dictionaries", () => {
    const i18nFilePath = path.resolve(__dirname, "../i18n.tsx");
    const content = fs.readFileSync(i18nFilePath, "utf8");

    // Extract translations.en and translations.ar objects
    const enMatch = content.match(/en:\s*\{([\s\S]*?)\},\s*ar:\s*\{/);
    const arMatch = content.match(/ar:\s*\{([\s\S]*?)\},\s*\};/);

    expect(enMatch).not.toBeNull();
    expect(arMatch).not.toBeNull();

    // Extract all property keys
    const extractKeys = (block: string) => {
      const keys: string[] = [];
      const lines = block.split("\n");
      for (const line of lines) {
        const keyMatch = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (keyMatch && keyMatch[1]) {
          keys.push(keyMatch[1]);
        }
      }
      return keys.sort();
    };

    const enKeys = extractKeys(enMatch![1]);
    const arKeys = extractKeys(arMatch![1]);

    expect(enKeys.length).toBeGreaterThan(50);
    expect(arKeys.length).toBeGreaterThan(50);
    expect(enKeys).toEqual(arKeys);

    // Verify key categories exist
    const essentialKeys = [
      "landingNavSignIn",
      "landingHeroH1",
      "landingCtaCreate",
      "authTitleSignIn",
      "authTitleSignUp",
      "authSubmitSignIn",
      "myCardsTitle",
      "createNewCard",
      "tagLinkedBadge",
      "digitalOnlyBadge",
      "backToCards",
      "customCreatorEngine",
      "presetPalettes",
      "fiveColorControls",
      "disablePublicModalTitle",
      "qrHubTitle",
      "qrDynamicProfile",
      "wallpaperGenTitle",
      "appleWalletPassBtn",
      "proBlocksTitle",
      "videoIntroTitle",
      "pdfDocTitle",
      "bookingTitle",
      "customCtaTitle",
      "emailAlertsTitle",
      "analyticsTitle",
      "connectionsTitle",
      "exportCsv",
      "dropzoneReplace",
      "dropzoneUpload",
      "cardNotExistTitle",
      "pageNotFound",
    ];

    for (const key of essentialKeys) {
      expect(enKeys).toContain(key);
      expect(arKeys).toContain(key);
    }
  });

  it("verifies all UI route and component files import and wire useTranslation", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const filesToCheck = [
      "src/routes/index.tsx",
      "src/routes/auth.tsx",
      "src/routes/dashboard.tsx",
      "src/routes/builder.tsx",
      "src/routes/__root.tsx",
      "src/components/dashboard/CardEditor.tsx",
      "src/components/dashboard/QrTab.tsx",
      "src/components/dashboard/ProFeaturesTab.tsx",
      "src/components/dashboard/AnalyticsTab.tsx",
      "src/components/dashboard/LeadsTab.tsx",
      "src/components/dashboard/Dropzone.tsx",
      "src/components/card/CardStatusPages.tsx",
    ];

    for (const file of filesToCheck) {
      const fullPath = path.resolve(rootDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf8");
      expect(content.includes("useTranslation") || content.includes("LanguageProvider")).toBe(true);
    }
  });
});
