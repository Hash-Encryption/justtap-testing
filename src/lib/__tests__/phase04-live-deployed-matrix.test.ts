import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";
import type { CommercialCatalogData } from "../payments/types";

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe("Phase 04 LIVE Deployed Supabase Database Matrix", () => {
  describe("Authoritative Commercial Catalog Live RPC Verification", () => {
    it("verifies get_public_commercial_catalog RPC exists and returns exact commercial pricing", async () => {
      const { data, error } = await anonClient.rpc("get_public_commercial_catalog");

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const catalog = data as CommercialCatalogData;
      expect(catalog.plans).toBeDefined();
      expect(catalog.prices).toBeDefined();
      expect(catalog.offers).toBeDefined();
      expect(catalog.products).toBeDefined();

      // 1. Verify Free plan
      const freePlan = catalog.plans.find((p) => p.code === "free");
      expect(freePlan).toBeDefined();
      expect(freePlan?.card_limit).toBe(1);

      // 2. Verify Pro plan
      const proPlan = catalog.plans.find((p) => p.code === "pro");
      expect(proPlan).toBeDefined();
      expect(proPlan?.card_limit).toBe(3);

      // 3. Verify Enterprise plan
      const entPlan = catalog.plans.find((p) => p.code === "enterprise");
      expect(entPlan).toBeDefined();
      expect(entPlan?.card_limit).toBe(5);

      // 4. Verify Pro Annual Price: 99 SAR (9900 minor units)
      const proPrice = catalog.prices.find((p) => p.plan_id === "pro");
      expect(proPrice).toBeDefined();
      expect(proPrice?.amount_minor).toBe(9900);
      expect(proPrice?.currency).toBe("SAR");
      expect(proPrice?.billing_interval).toBe("year");

      // 5. Verify Physical Matte Card: 149 SAR
      const matteProduct = catalog.products.find((p) => p.id === "pvc_matte_black");
      expect(matteProduct).toBeDefined();
      expect(matteProduct?.price).toBe(149.0);
      expect(matteProduct?.currency).toBe("SAR");

      // 6. Verify Pro + NFC Bundle: 199 SAR initial (19900 minor units), saves 49 SAR (4900 minor units)
      const bundleOffer = catalog.offers.find((o) => o.code === "pro_nfc_bundle");
      expect(bundleOffer).toBeDefined();
      expect(bundleOffer?.amount_minor).toBe(19900);
      expect(bundleOffer?.savings_amount_minor).toBe(4900);
      expect(bundleOffer?.currency).toBe("SAR");
      expect(bundleOffer?.included_physical_quantity).toBe(1);

      // 7. Verify Bundle Renewal Rule: 99 SAR/year with 0 physical cards
      expect(bundleOffer?.renewal_price_id).toBe("price_pro_annual_99_sar");
      const renewalPrice = catalog.prices.find((p) => p.id === bundleOffer?.renewal_price_id);
      expect(renewalPrice?.amount_minor).toBe(9900);
      expect(renewalPrice?.amount_minor).not.toBe(19900);
    });
  });

  describe("Historical Orders Price Snapshot Preservation", () => {
    it("verifies historical physical card orders retain their historical price snapshots", async () => {
      // Direct query on card_orders
      const { data, error } = await anonClient
        .from("card_orders")
        .select("id, order_number, product_price_snapshot, total_amount_snapshot")
        .limit(10);

      // RLS correctly applies (either empty array or historical rows)
      expect(error?.code).not.toBe("PGRST205"); // Table exists
      if (data && data.length > 0) {
        for (const order of data) {
          // Snapshots are stored numbers and are not mutated by catalog updates
          expect(typeof order.product_price_snapshot).toBe("number");
          expect(typeof order.total_amount_snapshot).toBe("number");
        }
      }
    });
  });

  describe("Database RLS & Security Boundaries", () => {
    it("verifies payment_methods table direct SELECT is restricted/denied to protect provider tokens", async () => {
      const { data, error } = await anonClient.from("payment_methods").select("*");

      // Either permission denied (42501) or RLS returns null/empty for anonymous client
      expect(error?.code).not.toBe("PGRST205"); // Table exists
      expect(data === null || data.length === 0 || error?.code === "42501").toBe(true);
    });

    it("verifies direct mutation on financial tables (plans, prices, payments, subscriptions) is blocked for non-service-role", async () => {
      // 1. Direct plan mutation attempt
      const { error: planInsertError } = await anonClient
        .from("billing_plans")
        .insert([{ id: "hacked_plan", code: "hacked", name: "Hacked", card_limit: 100 }]);
      expect(planInsertError?.code).toBe("42501");

      // 2. Direct price mutation attempt
      const { error: priceInsertError } = await anonClient
        .from("billing_prices")
        .insert([{ id: "hacked_price", plan_id: "pro", amount_minor: 1 }]);
      expect(priceInsertError?.code).toBe("42501");

      // 3. Direct payment mutation attempt
      const { error: paymentInsertError } = await anonClient
        .from("payments")
        .insert([{ amount_minor: 100, currency: "SAR", status: "paid" }]);
      expect(paymentInsertError?.code).toBe("42501");

      // 4. Direct subscription mutation attempt
      const { error: subInsertError } = await anonClient
        .from("subscriptions")
        .insert([{ plan_id: "pro", status: "active" }]);
      expect(subInsertError?.code).toBe("42501");

      // 5. Direct refund mutation attempt
      const { error: refundInsertError } = await anonClient
        .from("payment_refunds")
        .insert([{ amount_minor: 100, status: "succeeded" }]);
      expect(refundInsertError?.code).toBe("42501");
    });

    it("verifies anonymous invocation of all 6 Admin Billing RPCs fails closed with 42501", async () => {
      // 1. admin_get_billing_overview
      const { error: e1 } = await anonClient.rpc("admin_get_billing_overview");
      expect(e1?.code).toBe("42501");

      // 2. admin_get_payments
      const { error: e2 } = await anonClient.rpc("admin_get_payments");
      expect(e2?.code).toBe("42501");

      // 3. admin_get_payment_detail
      const { error: e3 } = await anonClient.rpc("admin_get_payment_detail", {
        _payment_id: "00000000-0000-0000-0000-000000000000",
      });
      expect(e3?.code).toBe("42501");

      // 4. admin_get_subscriptions
      const { error: e4 } = await anonClient.rpc("admin_get_subscriptions");
      expect(e4?.code).toBe("42501");

      // 5. admin_request_refund
      const { error: e5 } = await anonClient.rpc("admin_request_refund", {
        _payment_id: "00000000-0000-0000-0000-000000000000",
        _amount_minor: 1000,
        _reason: "Test",
        _admin_note: "Test note",
        _idempotency_key: "test_idem",
      });
      expect(e5?.code).toBe("42501");

      // 6. admin_get_reconciliation
      const { error: e6 } = await anonClient.rpc("admin_get_reconciliation");
      expect(e6?.code).toBe("42501");
    });
  });

  describe("Customer Billing RPCs Live Authorization & Boundaries", () => {
    it("verifies anonymous invocation of customer billing RPCs fails closed with 42501", async () => {
      // 1. get_user_payment_methods
      const { error: e1 } = await anonClient.rpc("get_user_payment_methods");
      expect(e1?.code).toBe("42501");

      // 2. get_user_billing_overview
      const { error: e2 } = await anonClient.rpc("get_user_billing_overview");
      expect(e2?.code).toBe("42501");

      // 3. get_user_billing_history
      const { error: e3 } = await anonClient.rpc("get_user_billing_history");
      expect(e3?.code).toBe("42501");

      // 4. create_bundle_order_and_subscription
      const { error: e4 } = await anonClient.rpc("create_bundle_order_and_subscription", {
        _card_id: "00000000-0000-0000-0000-000000000000",
        _recipient_name: "Test Recipient",
        _recipient_phone: "+966500000000",
        _national_address: "1234 Test",
        _city: "Riyadh",
        _postal_code: "12345",
        _delivery_instructions: "None",
        _idempotency_key: "idem_test_live",
      });
      expect(e4?.code).toBe("42501");
    });
  });
});
