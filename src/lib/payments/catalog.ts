import { supabase } from "../supabase";
import type { CommercialCatalogData } from "./types";

export const PLAN_FREE = "free";
export const PLAN_PRO = "pro";
export const PLAN_ENTERPRISE = "enterprise";

export const PRICE_PRO_ANNUAL = "price_pro_annual_99_sar";
export const OFFER_PRO_NFC_BUNDLE = "offer_pro_nfc_bundle";
export const PRODUCT_NFC_MATTE_BLACK = "pvc_matte_black";

/**
 * Fallback commercial catalog snapshot used only when offline or during testing prior to DB seed.
 * Authoritative prices and offers are strictly fetched from the database RPC get_public_commercial_catalog().
 */
export const FALLBACK_COMMERCIAL_CATALOG: CommercialCatalogData = {
  plans: [
    {
      id: "free",
      code: "free",
      name: "JustTap Free",
      name_ar: "JustTap مجاني",
      card_limit: 1,
      features: ["1 Digital Card", "QR Code", "vCard Download", "Classic V2 Theme"],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "pro",
      code: "pro",
      name: "JustTap Pro",
      name_ar: "JustTap برو",
      card_limit: 3,
      features: [
        "3 Digital Cards",
        "Custom Creator Engine",
        "Remove JustTap Branding",
        "Video Introduction",
        "PDF Brochure",
        "Appointment Booking",
        "Custom CTA",
        "Connection Alerts",
        "Lead Webhooks",
        "Apple Wallet Pass",
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enterprise",
      code: "enterprise",
      name: "JustTap Enterprise",
      name_ar: "JustTap للمؤسسات",
      card_limit: 5,
      features: [
        "5 Digital Cards",
        "Team Multi-Card Management",
        "Dedicated Support",
        "Priority NFC Card Fulfillment",
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  prices: [
    {
      id: "price_free_0",
      plan_id: "free",
      amount_minor: 0,
      currency: "SAR",
      billing_interval: "year",
      billing_interval_count: 1,
      is_active: true,
      is_self_service: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "price_pro_annual_99_sar",
      plan_id: "pro",
      amount_minor: 9900,
      currency: "SAR",
      billing_interval: "year",
      billing_interval_count: 1,
      is_active: true,
      is_self_service: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  offers: [
    {
      id: "offer_pro_nfc_bundle",
      code: "pro_nfc_bundle",
      name: "Pro + NFC Card Bundle",
      name_ar: "باقة برو + بطاقة NFC الذكية",
      amount_minor: 19900,
      currency: "SAR",
      included_plan_id: "pro",
      included_price_id: "price_pro_annual_99_sar",
      included_physical_product_id: "pvc_matte_black",
      included_physical_quantity: 1,
      initial_subscription_duration_days: 365,
      renewal_price_id: "price_pro_annual_99_sar",
      savings_amount_minor: 4900,
      is_active: true,
      metadata: { badge: "Best Value", badge_ar: "القيمة الأفضل" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  products: [
    {
      id: "pvc_matte_black",
      name: "JustTap Matte Card",
      name_ar: "بطاقة JustTap الذكية (مطفي)",
      variant: "Matte Black PVC",
      variant_ar: "أسود مطفي",
      sku: "JT-NFC-PVC-BLK",
      price: 149.0,
      currency: "SAR",
      is_active: true,
    },
  ],
};

export const COMMERCIAL_PLANS = FALLBACK_COMMERCIAL_CATALOG.plans;
export const COMMERCIAL_PRICES = FALLBACK_COMMERCIAL_CATALOG.prices;
export const COMMERCIAL_OFFERS = FALLBACK_COMMERCIAL_CATALOG.offers;
export const COMMERCIAL_PRODUCTS = FALLBACK_COMMERCIAL_CATALOG.products;

/**
 * Loads the public commercial catalog from the database server authority.
 */
export async function getPublicCommercialCatalog(): Promise<{
  data: CommercialCatalogData;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_public_commercial_catalog");
    if (error || !data) {
      return { data: FALLBACK_COMMERCIAL_CATALOG, error: error?.message || null };
    }
    return { data: data as CommercialCatalogData, error: null };
  } catch (err) {
    return {
      data: FALLBACK_COMMERCIAL_CATALOG,
      error: err instanceof Error ? err.message : "Failed to load commercial catalog",
    };
  }
}
