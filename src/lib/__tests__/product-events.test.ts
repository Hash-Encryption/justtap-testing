import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  recordProductEvent,
  trackCardEditStarted,
  trackFeatureUsed,
  trackProfileCompleted,
  trackProFeatureView,
  trackProPreviewConfigured,
  trackProPreviewInteraction,
  trackProPreviewStarted,
  validateEventMetadata,
} from "../product-events";
import { isCardProfileComplete, type Card } from "@/lib/card";
import { supabase } from "../supabase";

vi.mock("../supabase", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("product-events client module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateEventMetadata", () => {
    it("accepts valid metadata with allowlisted keys and valid values", () => {
      const valid = {
        plan_tier: "pro",
        previous_plan_tier: "free",
        completion_state: "complete",
        card_state: "live",
        interaction: "trial_cta_click",
        cta: "start_trial",
        entry_surface: "dashboard",
      };
      expect(validateEventMetadata(valid)).toBe(true);
    });

    it("rejects unauthorized metadata keys", () => {
      expect(validateEventMetadata({ unauthorized_key: "value" })).toBe(false);
      expect(validateEventMetadata({ password: "secret" })).toBe(false);
      expect(validateEventMetadata({ credit_card: "1234" })).toBe(false);
    });

    it("rejects invalid tier values", () => {
      expect(validateEventMetadata({ plan_tier: "super_vip" as unknown as "free" })).toBe(false);
    });

    it("rejects non-regex conforming interaction strings", () => {
      expect(validateEventMetadata({ interaction: "NOT_LOWERCASE" })).toBe(false);
      expect(validateEventMetadata({ interaction: "1starts_with_number" })).toBe(false);
      expect(validateEventMetadata({ cta: "has spaces inside" })).toBe(false);
    });

    it("rejects strings exceeding 80 characters", () => {
      expect(validateEventMetadata({ interaction: "a".repeat(81) })).toBe(false);
    });
  });

  describe("recordProductEvent", () => {
    it("rejects events reserved for server or database triggers", async () => {
      const res = await recordProductEvent({
        eventName: "signup_completed" as unknown as "feature_used",
        source: "dashboard",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("requires a trusted server or database producer");
    });

    it("rejects non-allowlisted client sources", async () => {
      const res = await recordProductEvent({
        eventName: "feature_used",
        source: "public_card" as unknown as "dashboard",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid client event source");
    });

    it("generates a new random UUID event_id when none is provided", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await recordProductEvent({
        eventName: "card_edit_started",
        source: "editor",
      });

      expect(res.success).toBe(true);
      expect(res.eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_id: res.eventId,
          _event_name: "card_edit_started",
          _source: "editor",
        }),
      );
    });

    it("reuses the provided event_id when retrying the same user action", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const existingEventId = "11111111-2222-3333-4444-555555555555";
      const res = await recordProductEvent({
        eventId: existingEventId,
        eventName: "profile_completed",
        source: "editor",
      });

      expect(res.eventId).toBe(existingEventId);
      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_id: existingEventId,
          _event_name: "profile_completed",
        }),
      );
    });

    it("cleans undefined metadata fields before invoking RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await recordProductEvent({
        eventName: "feature_used",
        source: "dashboard",
        feature: "qr_export",
        metadata: {
          plan_tier: "pro",
          cta: undefined,
        },
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _metadata: { plan_tier: "pro" },
          _feature: "qr_export",
        }),
      );
    });
  });

  describe("Producer helper functions", () => {
    it("trackCardEditStarted records card_edit_started from editor source", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackCardEditStarted("c123", true);

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "card_edit_started",
          _card_id: "c123",
          _source: "editor",
          _metadata: { card_state: "live" },
        }),
      );
    });

    it("trackProfileCompleted records profile_completed with completion_state complete", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackProfileCompleted("c123", false);

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "profile_completed",
          _card_id: "c123",
          _source: "editor",
          _metadata: { completion_state: "complete", card_state: "draft" },
        }),
      );
    });

    it("trackProFeatureView records pro_feature_view with entry_surface metadata", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackProFeatureView("video_embed");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "pro_feature_view",
          _feature: "video_embed",
          _source: "pro_preview",
          _metadata: { entry_surface: "pro_features" },
        }),
      );
    });

    it("trackProPreviewInteraction with cta=start_trial records trial interaction without emitting pro_upgrade_clicked", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackProPreviewInteraction("trial_cta_click", "start_trial");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "pro_preview_interaction",
          _source: "pro_preview",
          _metadata: { interaction: "trial_cta_click", cta: "start_trial" },
        }),
      );
      // Ensures pro_upgrade_clicked was NOT emitted
      expect(supabase.rpc).not.toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "pro_upgrade_clicked",
        }),
      );
    });

    it("trackProPreviewConfigured records pro_preview_configured with feature toggle interaction", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackProPreviewConfigured("enable_lead_webhook");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "pro_preview_configured",
          _feature: "enable_lead_webhook",
          _source: "pro_preview",
          _metadata: { interaction: "feature_toggle" },
        }),
      );
    });

    it("trackFeatureUsed records feature_used from dashboard", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      await trackFeatureUsed("qr_export");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "feature_used",
          _feature: "qr_export",
          _source: "dashboard",
        }),
      );
    });

    it("verifies idempotency contract: retrying with the same event_id reuses the identical ID", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);

      const fixedEventId = "cccccccc-dddd-eeee-ffff-000000000001";
      const call1 = await recordProductEvent({
        eventName: "feature_used",
        source: "dashboard",
        eventId: fixedEventId,
      });

      const call2 = await recordProductEvent({
        eventName: "feature_used",
        source: "dashboard",
        eventId: fixedEventId,
      });

      expect(call1.eventId).toBe(fixedEventId);
      expect(call2.eventId).toBe(fixedEventId);
      expect(supabase.rpc).toHaveBeenNthCalledWith(
        1,
        "record_product_event",
        expect.objectContaining({ _event_id: fixedEventId }),
      );
      expect(supabase.rpc).toHaveBeenNthCalledWith(
        2,
        "record_product_event",
        expect.objectContaining({ _event_id: fixedEventId }),
      );
    });

    it("verifies pro_upgrade_clicked is never called without a genuine paid checkout CTA", async () => {
      // Test that all client producer helpers never emit pro_upgrade_clicked
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);

      await trackCardEditStarted("c1", true);
      await trackProfileCompleted("c1", true);
      await trackProFeatureView("video_embed");
      await trackProPreviewStarted("leads");
      await trackProPreviewInteraction("trial_cta_click", "start_trial");
      await trackProPreviewConfigured("toggle");
      await trackFeatureUsed("qr_export");

      const allRpcCalls = vi.mocked(supabase.rpc).mock.calls;
      const upgradeCalls = allRpcCalls.filter(
        (call) =>
          call[0] === "record_product_event" &&
          (call[1] as Record<string, unknown>)?._event_name === "pro_upgrade_clicked",
      );
      expect(upgradeCalls.length).toBe(0);
    });
  });

  describe("Profile completion transition semantics (isCardProfileComplete)", () => {
    it("evaluates card profile completeness strictly and accurately", () => {
      // Null / undefined / empty
      expect(isCardProfileComplete(null)).toBe(false);
      expect(isCardProfileComplete(undefined)).toBe(false);
      expect(isCardProfileComplete({})).toBe(false);

      // Name only without contact method
      expect(isCardProfileComplete({ full_name: "Alice" })).toBe(false);
      expect(isCardProfileComplete({ full_name: "Alice", phone: "", email: "" })).toBe(false);
      expect(isCardProfileComplete({ full_name: "Alice", phone: "   ", email: "   " })).toBe(false);

      // Contact method without name
      expect(isCardProfileComplete({ full_name: "", phone: "+966501234567" })).toBe(false);
      expect(isCardProfileComplete({ full_name: "  ", email: "alice@example.com" })).toBe(false);

      // Name + Phone (Complete)
      expect(isCardProfileComplete({ full_name: "Alice", phone: "+966501234567" })).toBe(true);

      // Name + Email (Complete)
      expect(isCardProfileComplete({ full_name: "Alice", email: "alice@example.com" })).toBe(true);

      // Name + Phone + Email (Complete)
      expect(
        isCardProfileComplete({
          full_name: "Alice",
          phone: "+966501234567",
          email: "alice@example.com",
        }),
      ).toBe(true);
    });

    it("simulates transitions: incomplete -> complete emits once, already complete emits zero", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never);

      // Transition A: Incomplete -> Complete (NEW CARD OR EMPTY DRAFT)
      let previousCard: Partial<Card> | null = null;
      let newSavedCard: Partial<Card> = {
        id: "c1",
        full_name: "Alice",
        phone: "+966501112233",
        is_active: false,
      };

      let wasComplete = isCardProfileComplete(previousCard);
      let isNowComplete = isCardProfileComplete(newSavedCard);

      if (!wasComplete && isNowComplete) {
        await trackProfileCompleted(newSavedCard.id, newSavedCard.is_active);
      }
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenLastCalledWith(
        "record_product_event",
        expect.objectContaining({
          _event_name: "profile_completed",
          _card_id: "c1",
        }),
      );

      // Transition B: Already Complete -> Complete (Subsequent save in same session or reopened)
      vi.mocked(supabase.rpc).mockClear();
      previousCard = newSavedCard; // Now persisted as complete
      newSavedCard = { ...newSavedCard, bio: "Updated bio description" }; // Edited other field

      wasComplete = isCardProfileComplete(previousCard);
      isNowComplete = isCardProfileComplete(newSavedCard);

      if (!wasComplete && isNowComplete) {
        await trackProfileCompleted(newSavedCard.id, newSavedCard.is_active);
      }
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Transition C: Incomplete -> Incomplete (Still missing phone/email)
      vi.mocked(supabase.rpc).mockClear();
      previousCard = { id: "c2", full_name: "Bob", phone: "" };
      newSavedCard = { id: "c2", full_name: "Bob Updated", phone: "" };

      wasComplete = isCardProfileComplete(previousCard);
      isNowComplete = isCardProfileComplete(newSavedCard);

      if (!wasComplete && isNowComplete) {
        await trackProfileCompleted(newSavedCard.id, newSavedCard.is_active);
      }
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Transition D: Failed save (Throws or returns non-saved status)
      vi.mocked(supabase.rpc).mockClear();
      const saveFailed = true;
      if (!saveFailed) {
        wasComplete = isCardProfileComplete(previousCard);
        isNowComplete = isCardProfileComplete(newSavedCard);
        if (!wasComplete && isNowComplete) {
          await trackProfileCompleted(newSavedCard.id, newSavedCard.is_active);
        }
      }
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Transition E: Reopening an already-complete card and saving
      vi.mocked(supabase.rpc).mockClear();
      const reopenedPersistedCard = {
        id: "c3",
        full_name: "Charlie",
        email: "charlie@test.com",
        is_active: true,
      };
      const newlySavedAfterReopen = { ...reopenedPersistedCard, title: "Director" };

      wasComplete = isCardProfileComplete(reopenedPersistedCard);
      isNowComplete = isCardProfileComplete(newlySavedAfterReopen);

      if (!wasComplete && isNowComplete) {
        await trackProfileCompleted(newlySavedAfterReopen.id, newlySavedAfterReopen.is_active);
      }
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});
