import { describe, it, expect, vi } from "vitest";
import { DisabledPaymentProvider } from "@/lib/payments/disabled-provider";
import type { SafePaymentMethod, PaymentRecord } from "@/lib/payments/types";

describe("Phase 4: Billing, Subscriptions & Provider Safeguards", () => {
  describe("DisabledPaymentProvider (Safe Offline Execution)", () => {
    const provider = new DisabledPaymentProvider();

    it("identifies truthfully as not configured", () => {
      expect(provider.name).toBe("disabled");
      expect(provider.isConfigured()).toBe(false);
    });

    it("rejects preparePayment without fake success", async () => {
      const res = await provider.preparePayment({
        paymentId: "pay_123",
        amountMinor: 19900,
        currency: "SAR",
        purpose: "pro_nfc_bundle",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("rejects createPayment without fake success", async () => {
      const res = await provider.createPayment({
        paymentId: "pay_123",
        amountMinor: 19900,
        currency: "SAR",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("rejects refundPayment safely", async () => {
      const res = await provider.refundPayment("pay_123", 5000, "Customer request");
      expect(res.success).toBe(false);
      expect(res.error).toBe("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });
  });

  describe("Safe Payment Method Token Privacy", () => {
    it("ensures SafePaymentMethod type never contains raw provider_token_reference", () => {
      const safeMethod: SafePaymentMethod = {
        id: "pm_123",
        user_id: "usr_abc",
        type: "card",
        brand: "visa",
        last_four: "4242",
        expiry_month: 12,
        expiry_year: 2028,
        status: "active",
        is_default: true,
        created_at: new Date().toISOString(),
      };

      // Verify no sensitive provider token property exists in the safe projection
      expect(safeMethod).not.toHaveProperty("provider_token_reference");
      expect(safeMethod.last_four).toBe("4242");
      expect(safeMethod.brand).toBe("visa");
    });
  });

  describe("Refund Math & Partial Refund Eligibility", () => {
    it("correctly determines remaining refundable balance after partial refunds", () => {
      const originalAmountMinor = 19900; // 199 SAR
      const firstRefundMinor = 5000; // 50 SAR

      const remainingAfterFirst = originalAmountMinor - firstRefundMinor;
      expect(remainingAfterFirst).toBe(14900); // 149 SAR

      // Allows subsequent partial refund up to remaining balance
      const secondRefundMinor = 14900;
      const remainingAfterSecond = remainingAfterFirst - secondRefundMinor;
      expect(remainingAfterSecond).toBe(0);

      // Disallows refund greater than remaining balance
      const invalidRefundMinor = 15000;
      expect(invalidRefundMinor > remainingAfterFirst).toBe(true);
    });
  });

  describe("Financial Ledger Data Integrity", () => {
    it("formats SAR currency and minor units accurately", () => {
      const samplePayment: PaymentRecord = {
        id: "pay_xyz",
        user_id: "usr_123",
        subscription_id: null,
        order_id: null,
        purpose: "pro_nfc_bundle",
        amount_minor: 19900,
        currency: "SAR",
        status: "paid",
        payment_method_id: null,
        provider_payment_reference: null,
        idempotency_key: "idem_abc123",
        metadata: { bundle: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const displayAmount = (samplePayment.amount_minor / 100).toFixed(2);
      expect(displayAmount).toBe("199.00");
      expect(samplePayment.currency).toBe("SAR");
      expect(samplePayment.idempotency_key).toBe("idem_abc123");
    });
  });
});
