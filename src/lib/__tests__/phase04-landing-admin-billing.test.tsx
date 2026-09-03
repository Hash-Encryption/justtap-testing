import { describe, it, expect } from "vitest";
import { translations } from "@/lib/i18n";

describe("Phase 4: Landing Page, Account & Admin Billing UI Localization", () => {
  it("contains all required Phase 4 translation keys in English", () => {
    const en = translations.en;

    // Pricing Section Keys
    expect(en.pricingTitle).toBe("Simple, Transparent Pricing");
    expect(en.pricingProTitle).toBe("Pro");
    expect(en.pricingProPrice).toBe("99 SAR");
    expect(en.pricingNfcTitle).toBe("JustTap NFC Card");
    expect(en.pricingNfcPrice).toBe("149 SAR");
    expect(en.pricingBundleTitle).toBe("Pro + NFC Card Bundle");
    expect(en.pricingBundlePrice).toBe("199 SAR");
    expect(en.pricingBundleSave).toBe("Save 49 SAR");
    expect(en.pricingBundleRenewalCopy).toContain("99 SAR/year after the first year");
    expect(en.pricingFreePrompt).toContain("Start with JustTap Free");

    // Account Center Billing Keys
    expect(en.tabBilling).toBe("Billing & Subscription");
    expect(en.noBillingHistory).toBe("No billing history yet.");
    expect(en.noPaymentMethods).toBe("No payment method saved.");
    expect(en.upgradeToProAnnual).toContain("99 SAR/year");
    expect(en.upgradeToBundle).toContain("199 SAR");
    expect(en.bundleRenewalNotice).toContain("Pro will renew at 99 SAR/year after the first year");
    expect(en.providerNotConnectedNotice).toContain(
      "Payment processing is currently being prepared",
    );

    // Admin Billing Keys
    expect(en.adminTabBilling).toBe("Billing & Commerce");
    expect(en.adminBillingOverview).toBe("Billing Overview");
    expect(en.adminPaidRevenue).toBe("Paid Revenue");
    expect(en.adminRefundBtn).toBe("Request Refund");
    expect(en.adminRefundSuccess).toContain("awaiting provider processing");
  });

  it("contains all required Phase 4 translation keys in Arabic", () => {
    const ar = translations.ar;

    // Pricing Section Keys
    expect(ar.pricingTitle).toBe("باقات واضحة ومرنة");
    expect(ar.pricingProTitle).toBe("برو (Pro)");
    expect(ar.pricingProPrice).toBe("99 ر.س");
    expect(ar.pricingNfcTitle).toBe("بطاقة JustTap الذكية (NFC)");
    expect(ar.pricingNfcPrice).toBe("149 ر.س");
    expect(ar.pricingBundleTitle).toBe("باقة برو + بطاقة NFC الذكية");
    expect(ar.pricingBundlePrice).toBe("199 ر.س");
    expect(ar.pricingBundleSave).toBe("وفر 49 ر.س");
    expect(ar.pricingBundleRenewalCopy).toContain(
      "تجدد باقة Pro بسعر 99 ر.س/سنوياً بعد السنة الأولى",
    );
    expect(ar.pricingFreePrompt).toContain("ابدأ مع JustTap مجاناً");

    // Account Center Billing Keys
    expect(ar.tabBilling).toBe("الاشتراك والفوترة");
    expect(ar.noBillingHistory).toBe("لا يوجد سجل فواتير حتى الآن.");
    expect(ar.noPaymentMethods).toBe("لا توجد وسيلة دفع محفوظة.");
    expect(ar.upgradeToProAnnual).toContain("99 ر.س/سنوياً");
    expect(ar.upgradeToBundle).toContain("199 ر.س");
    expect(ar.bundleRenewalNotice).toContain("يتجدد اشتراك Pro بقيمة 99 ر.س/سنوياً");
    expect(ar.providerNotConnectedNotice).toContain("نظام معالجة المدفوعات قيد الإعداد التقني");

    // Admin Billing Keys
    expect(ar.adminTabBilling).toBe("الفوترة والتجارة");
    expect(ar.adminBillingOverview).toBe("نظرة عامة على الفوترة");
    expect(ar.adminPaidRevenue).toBe("الإيرادات المدفوعة");
    expect(ar.adminRefundBtn).toBe("طلب استرجاع");
    expect(ar.adminRefundSuccess).toContain("في انتظار معالجة بوابة الدفع");
  });

  it("ensures key symmetry between English and Arabic translations", () => {
    const enKeys = Object.keys(translations.en) as (keyof typeof translations.en)[];
    const arKeys = Object.keys(translations.ar) as (keyof typeof translations.ar)[];

    expect(arKeys.length).toBe(enKeys.length);
    for (const key of enKeys) {
      expect(translations.ar[key]).toBeDefined();
      expect(translations.ar[key].length).toBeGreaterThan(0);
    }
  });
});
