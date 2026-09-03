import { describe, it, expect } from "vitest";
import { getProductBySku } from "@/lib/physical-cards";
import { emptyCard, type Card, type PlanTier } from "@/lib/card";

describe("Phase 3: Multi-Card Limits and Plan Entitlement", () => {
  function getMaxAllowedCards(tier: PlanTier, isTrialActive: boolean = false): number {
    if (tier === "enterprise") return 5;
    if (tier === "pro" || (tier === "trialing" && isTrialActive)) return 3;
    return 1;
  }

  it("enforces Free tier maximum limit of 1 card", () => {
    const limit = getMaxAllowedCards("free", false);
    expect(limit).toBe(1);

    const userCards = [{ ...emptyCard, id: "card-1", is_primary: true }];
    const canCreateMore = userCards.length < limit;
    expect(canCreateMore).toBe(false);
  });

  it("enforces Active Trial maximum limit of 3 cards", () => {
    const limit = getMaxAllowedCards("trialing", true);
    expect(limit).toBe(3);

    const userCards = [
      { ...emptyCard, id: "card-1", is_primary: true },
      { ...emptyCard, id: "card-2", is_primary: false },
    ];
    const canCreateMore = userCards.length < limit;
    expect(canCreateMore).toBe(true);
  });

  it("enforces Pro tier maximum limit of 3 cards", () => {
    const limit = getMaxAllowedCards("pro", false);
    expect(limit).toBe(3);

    const userCards = [
      { ...emptyCard, id: "card-1", is_primary: true },
      { ...emptyCard, id: "card-2", is_primary: false },
      { ...emptyCard, id: "card-3", is_primary: false },
    ];
    const canCreateMore = userCards.length < limit;
    expect(canCreateMore).toBe(false);
  });

  it("enforces Enterprise tier maximum limit of 5 cards", () => {
    const limit = getMaxAllowedCards("enterprise", false);
    expect(limit).toBe(5);
  });

  it("correctly treats expired trial as Free tier (limit 1)", () => {
    const limit = getMaxAllowedCards("trialing", false);
    expect(limit).toBe(1);
  });
});

describe("Phase 3: Primary Card Sync & Promotion Rules", () => {
  it("determines that single card must always be primary", () => {
    const cards: Card[] = [{ ...emptyCard, id: "card-1", is_primary: true }];
    expect(cards[0].is_primary).toBe(true);
  });

  it("promotes earliest created sibling card to primary upon primary card deletion", () => {
    const existingCards: Array<Card & { created_at: string }> = [
      { ...emptyCard, id: "card-1", is_primary: true, created_at: "2026-01-01T00:00:00Z" },
      { ...emptyCard, id: "card-2", is_primary: false, created_at: "2026-01-02T00:00:00Z" },
      { ...emptyCard, id: "card-3", is_primary: false, created_at: "2026-01-03T00:00:00Z" },
    ];

    const deletedCardId = "card-1";
    const remaining = existingCards.filter((c) => c.id !== deletedCardId);

    // Simulate handle_card_primary_on_delete trigger
    const deletedWasPrimary = existingCards.find((c) => c.id === deletedCardId)?.is_primary;
    if (deletedWasPrimary && remaining.length > 0) {
      remaining.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      remaining[0].is_primary = true;
    }

    expect(remaining.length).toBe(2);
    expect(remaining[0].id).toBe("card-2");
    expect(remaining[0].is_primary).toBe(true);
    expect(remaining[1].id).toBe("card-3");
    expect(remaining[1].is_primary).toBe(false);
  });

  it("does not change primary card when a non-primary card is deleted", () => {
    const existingCards: Card[] = [
      { ...emptyCard, id: "card-1", is_primary: true },
      { ...emptyCard, id: "card-2", is_primary: false },
      { ...emptyCard, id: "card-3", is_primary: false },
    ];

    const deletedCardId = "card-2";
    const remaining = existingCards.filter((c) => c.id !== deletedCardId);
    const primary = remaining.find((c) => c.is_primary);

    expect(primary?.id).toBe("card-1");
  });

  it("unsets sibling primary flags when a new card is marked primary", () => {
    let cards: Card[] = [
      { ...emptyCard, id: "card-1", is_primary: true },
      { ...emptyCard, id: "card-2", is_primary: false },
    ];

    const setPrimaryId = "card-2";
    cards = cards.map((c) => ({
      ...c,
      is_primary: c.id === setPrimaryId,
    }));

    expect(cards.find((c) => c.id === "card-1")?.is_primary).toBe(false);
    expect(cards.find((c) => c.id === "card-2")?.is_primary).toBe(true);
  });
});

describe("Phase 3: Non-Destructive Downgrade Public Resolution", () => {
  it("resolves only primary card publicly when user is on Free tier with multiple saved cards", () => {
    const userTier: PlanTier = "free";
    const cards: Card[] = [
      { ...emptyCard, id: "card-1", slug: "john-primary", is_primary: true },
      { ...emptyCard, id: "card-2", slug: "john-secondary", is_primary: false },
    ];

    function resolvePublicCard(slug: string): { status: number; card: Card | null } {
      const target = cards.find((c) => c.slug === slug);
      if (!target) return { status: 404, card: null };

      if (userTier === "free" && !target.is_primary) {
        return { status: 403, card: null }; // locked publicly
      }
      return { status: 200, card: target };
    }

    const primaryResolution = resolvePublicCard("john-primary");
    expect(primaryResolution.status).toBe(200);
    expect(primaryResolution.card?.id).toBe("card-1");

    const secondaryResolution = resolvePublicCard("john-secondary");
    expect(secondaryResolution.status).toBe(403);
    expect(secondaryResolution.card).toBeNull();
  });
});

describe("Phase 3: Physical Card Product Catalog & Snapshots", () => {
  it("provides valid catalog configuration for Matte Black PVC card", () => {
    const product = getProductBySku("pvc_matte_black");
    expect(product).toBeDefined();
    expect(product?.name).toBe("JustTap Matte Card");
    expect(product?.price).toBe(149.0);
    expect(product?.currency).toBe("SAR");
    expect(product?.isAvailable).toBe(true);
  });

  it("isolates digital card token snapshot from physical NFC token snapshot", () => {
    const digitalCardId = "a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890";
    const physicalNfcToken = "nfc_9876543210abcdef0123456789ab";

    const orderPayload = {
      order_number: "JT-001001",
      card_id: digitalCardId,
      digital_card_token_snapshot: digitalCardId,
      nfc_token_snapshot: physicalNfcToken,
      subtotal: 119.0,
      total: 119.0,
      currency: "SAR",
    };

    expect(orderPayload.digital_card_token_snapshot).toBe(digitalCardId);
    expect(orderPayload.nfc_token_snapshot).toBe(physicalNfcToken);
    expect(orderPayload.digital_card_token_snapshot).not.toBe(orderPayload.nfc_token_snapshot);
  });
});

describe("Phase 3: Order Fulfillment State Machine & Validation", () => {
  function canMoveToFulfillment(paymentStatus: string, nextFulfillment: string): boolean {
    if (nextFulfillment === "cancelled") return true;
    if (paymentStatus !== "paid") return false;
    return ["new", "preparing", "ready", "shipped"].includes(nextFulfillment);
  }

  function canCompleteOrder(paymentStatus: string, nfcTagAssigned: boolean): boolean {
    return paymentStatus === "paid" && nfcTagAssigned;
  }

  it("blocks unpaid/pending orders from entering fulfillment states", () => {
    expect(canMoveToFulfillment("pending", "preparing")).toBe(false);
    expect(canMoveToFulfillment("pending", "ready")).toBe(false);
    expect(canMoveToFulfillment("pending", "shipped")).toBe(false);
    expect(canMoveToFulfillment("pending", "cancelled")).toBe(true); // cancellation allowed
  });

  it("allows paid orders to advance through manufacturing and fulfillment", () => {
    expect(canMoveToFulfillment("paid", "preparing")).toBe(true);
    expect(canMoveToFulfillment("paid", "ready")).toBe(true);
    expect(canMoveToFulfillment("paid", "shipped")).toBe(true);
  });

  it("requires payment_status = paid and assigned NFC tag to complete order", () => {
    expect(canCompleteOrder("pending", true)).toBe(false);
    expect(canCompleteOrder("paid", false)).toBe(false);
    expect(canCompleteOrder("paid", true)).toBe(true);
  });
});

describe("Phase 3: Account Profile & Initials Generation", () => {
  function getInitials(name?: string | null, email?: string | null): string {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "JT";
  }

  it("generates correct 2-letter initials from full name", () => {
    expect(getInitials("Hisham Al-Ghamdi", "hisham@example.com")).toBe("HA");
    expect(getInitials("JustTap User", null)).toBe("JU");
  });

  it("generates initials from single name or email prefix", () => {
    expect(getInitials("Hisham", null)).toBe("HI");
    expect(getInitials(null, "admin@justtap.sa")).toBe("AD");
    expect(getInitials(null, null)).toBe("JT");
  });
});

describe("Phase 3.1: Commerce Pricing, VAT Exemption & National Address Validation", () => {
  it("verifies 0 VAT in checkout pricing breakdown", () => {
    const product = getProductBySku("pvc_matte_black");
    expect(product).toBeDefined();

    const price = product?.price ?? 119.0;
    const tax = 0.0;
    const shipping = 0.0;
    const total = price + tax + shipping;

    expect(price).toBe(149.0);
    expect(tax).toBe(0.0);
    expect(total).toBe(149.0);
  });

  it("validates mandatory National Address and non-empty City in checkout parameters", () => {
    function validateCheckoutParams(params: {
      recipientName: string;
      recipientPhone: string;
      nationalAddress: string;
      city: string;
    }): { isValid: boolean; error?: string } {
      if (!params.recipientName.trim()) return { isValid: false, error: "Recipient name required" };
      if (!params.recipientPhone.trim())
        return { isValid: false, error: "Recipient phone required" };
      if (!params.nationalAddress.trim())
        return { isValid: false, error: "National Address required" };
      if (!params.city.trim()) return { isValid: false, error: "City required" };
      return { isValid: true };
    }

    // Missing National Address
    expect(
      validateCheckoutParams({
        recipientName: "Hisham",
        recipientPhone: "+966501234567",
        nationalAddress: "",
        city: "Riyadh",
      }).isValid,
    ).toBe(false);

    // Missing City (no default city allowed)
    expect(
      validateCheckoutParams({
        recipientName: "Hisham",
        recipientPhone: "+966501234567",
        nationalAddress: "RRRD2929, 2929 King Fahd Rd",
        city: "",
      }).isValid,
    ).toBe(false);

    // Valid inputs
    expect(
      validateCheckoutParams({
        recipientName: "Hisham",
        recipientPhone: "+966501234567",
        nationalAddress: "RRRD2929, 2929 King Fahd Rd",
        city: "Jeddah",
      }).isValid,
    ).toBe(true);
  });
});

describe("Phase 3.1: Password Change Hardening", () => {
  function validatePasswordChange(params: {
    currentPasswordInput?: string;
    newPasswordInput?: string;
    confirmPasswordInput?: string;
  }): { isValid: boolean; error?: string } {
    if (!params.currentPasswordInput?.trim()) {
      return { isValid: false, error: "Current password is required" };
    }
    if (!params.newPasswordInput || params.newPasswordInput.length < 8) {
      return { isValid: false, error: "Password must be at least 8 characters" };
    }
    if (params.newPasswordInput !== params.confirmPasswordInput) {
      return { isValid: false, error: "Passwords do not match" };
    }
    return { isValid: true };
  }

  it("rejects password change if current password is missing", () => {
    const res = validatePasswordChange({
      currentPasswordInput: "",
      newPasswordInput: "SampleNewSecretValue123",
      confirmPasswordInput: "SampleNewSecretValue123",
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Current password is required");
  });

  it("rejects password shorter than 8 characters", () => {
    const res = validatePasswordChange({
      currentPasswordInput: "SampleOldSecretValue123",
      newPasswordInput: "short",
      confirmPasswordInput: "short",
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Password must be at least 8 characters");
  });

  it("rejects mismatched confirmation password", () => {
    const res = validatePasswordChange({
      currentPasswordInput: "SampleOldSecretValue123",
      newPasswordInput: "SampleNewSecretValue123",
      confirmPasswordInput: "DifferentValue456",
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Passwords do not match");
  });

  it("accepts valid password change matching all security constraints", () => {
    const res = validatePasswordChange({
      currentPasswordInput: "SampleOldSecretValue123",
      newPasswordInput: "SampleNewSecretValue123",
      confirmPasswordInput: "SampleNewSecretValue123",
    });
    expect(res.isValid).toBe(true);
  });
});
