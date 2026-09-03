import { describe, it, expect } from "vitest";
import {
  FALLBACK_COMMERCIAL_CATALOG,
  COMMERCIAL_PLANS,
  COMMERCIAL_PRICES,
  COMMERCIAL_OFFERS,
} from "@/lib/payments/catalog";
import { DEFAULT_PHYSICAL_CARD_PRODUCT } from "@/lib/physical-cards";

describe("Phase 4: Commercial Pricing & Monetary Ledger Authority", () => {
  it("defines exact commercial pricing in minor units (SAR)", () => {
    const freePlan = COMMERCIAL_PLANS.find((p) => p.code === "free");
    expect(freePlan).toBeDefined();
    expect(freePlan?.card_limit).toBe(1);

    const proPlan = COMMERCIAL_PLANS.find((p) => p.code === "pro");
    expect(proPlan).toBeDefined();
    expect(proPlan?.card_limit).toBe(3);

    const entPlan = COMMERCIAL_PLANS.find((p) => p.code === "enterprise");
    expect(entPlan).toBeDefined();
    expect(entPlan?.card_limit).toBe(5);

    // Pro Annual: 99 SAR (9900 minor units)
    const proPrice = COMMERCIAL_PRICES.find((p) => p.plan_id === "pro");
    expect(proPrice).toBeDefined();
    expect(proPrice?.amount_minor).toBe(9900);
    expect(proPrice?.currency).toBe("SAR");
    expect(proPrice?.billing_interval).toBe("year");

    // Physical NFC Card: 149 SAR (14900 minor units)
    expect(DEFAULT_PHYSICAL_CARD_PRODUCT.price).toBe(149.0);

    // Pro + NFC Bundle: 199 SAR initial (19900 minor units), saves 49 SAR (4900 minor units)
    const bundleOffer = COMMERCIAL_OFFERS.find((o) => o.code === "pro_nfc_bundle");
    expect(bundleOffer).toBeDefined();
    expect(bundleOffer?.amount_minor).toBe(19900);
    expect(bundleOffer?.savings_amount_minor).toBe(4900);
    expect(bundleOffer?.currency).toBe("SAR");
  });

  it("enforces permanent bundle renewal rule: 99 SAR/year with 0 physical cards", () => {
    const bundleOffer = COMMERCIAL_OFFERS.find((o) => o.code === "pro_nfc_bundle");
    expect(bundleOffer).toBeDefined();

    // Initial purchase includes 1 physical card
    expect(bundleOffer?.included_physical_quantity).toBe(1);

    // Renewal price points to Pro annual (9900 minor units = 99 SAR), NEVER 19900
    expect(bundleOffer?.renewal_price_id).toBe("price_pro_annual_99_sar");
    const renewalPrice = COMMERCIAL_PRICES.find((p) => p.id === bundleOffer?.renewal_price_id);
    expect(renewalPrice?.amount_minor).toBe(9900);
  });

  it("calculates bundle savings accurately against standalone purchases", () => {
    const standaloneProMinor = 9900;
    const standaloneNfcMinor = 14900;
    const sumStandaloneMinor = standaloneProMinor + standaloneNfcMinor; // 24800 (248 SAR)

    const bundleMinor = 19900; // 199 SAR
    const calculatedSavings = sumStandaloneMinor - bundleMinor; // 4900 (49 SAR)

    expect(calculatedSavings).toBe(4900);

    const bundleOffer = COMMERCIAL_OFFERS.find((o) => o.code === "pro_nfc_bundle");
    expect(bundleOffer?.savings_amount_minor).toBe(calculatedSavings);
  });

  it("ensures fallback commercial catalog is complete and structured", () => {
    expect(FALLBACK_COMMERCIAL_CATALOG.plans.length).toBeGreaterThanOrEqual(3);
    expect(FALLBACK_COMMERCIAL_CATALOG.prices.length).toBeGreaterThanOrEqual(1);
    expect(FALLBACK_COMMERCIAL_CATALOG.offers.length).toBeGreaterThanOrEqual(1);
    expect(FALLBACK_COMMERCIAL_CATALOG.products.length).toBeGreaterThanOrEqual(1);
    expect(FALLBACK_COMMERCIAL_CATALOG.products[0].price).toBe(149.0);
  });
});
