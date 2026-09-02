import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  adminAssignNfcTag,
  adminCreateCard,
  adminCreateProfile,
  adminDeleteCard,
  adminDeleteProfile,
  adminProvisionNfcTag,
  adminSetCardActive,
  adminSetEntitlement,
  adminUpdateTagStatus,
  getOperations,
  getUserDetail,
  maskNfcToken,
} from "../operations";
import { supabase } from "../supabase";

vi.mock("../supabase", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("operations client module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("maskNfcToken", () => {
    it("returns placeholder for empty/falsy tokens", () => {
      expect(maskNfcToken("")).toBe("-");
      expect(maskNfcToken(null)).toBe("-");
      expect(maskNfcToken(undefined)).toBe("-");
    });

    it("returns short tokens unchanged", () => {
      expect(maskNfcToken("abc")).toBe("abc");
      expect(maskNfcToken("12345678")).toBe("12345678");
    });

    it("masks longer tokens showing 4 char prefix and 4 char suffix", () => {
      const token = "jt_tag_0123456789abcdef0123456789abcdef";
      const masked = maskNfcToken(token);
      expect(masked).toBe("jt_t••••cdef");
      expect(masked).not.toContain("0123456789");
    });
  });

  describe("getOperations", () => {
    it("calls admin_get_operations RPC and parses payload", async () => {
      const mockPayload = {
        overview: {
          total_users: 10,
          new_users: 2,
          activated_users: 8,
          live_cards: 5,
          inactive_cards: 2,
          connections: 15,
          trials_ending_soon: 1,
          tier_distribution: { free: 6, trialing: 2, pro: 2, enterprise: 0 },
        },
        users: [],
        cards: [],
        audit: [],
        product_analytics: {
          collection_started: "2026-08-29T00:00:00Z",
          dau: 5,
          wau: 8,
          mau: 10,
          events: {},
          recent: [],
        },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockPayload,
        error: null,
      } as never);

      const res = await getOperations({
        rangeStart: "2026-08-01T00:00:00Z",
        rangeEnd: "2026-08-30T00:00:00Z",
        search: "test",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_operations", {
        _range_start: "2026-08-01T00:00:00Z",
        _range_end: "2026-08-30T00:00:00Z",
        _search: "test",
      });
      expect(res.data).toEqual(mockPayload);
      expect(res.error).toBeNull();
    });

    it("returns error message when RPC fails", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "permission denied for function admin_get_operations" },
      } as never);

      const res = await getOperations({});
      expect(res.data).toBeNull();
      expect(res.error).toBe("permission denied for function admin_get_operations");
    });
  });

  describe("getUserDetail", () => {
    it("calls admin_get_user_detail RPC with user id", async () => {
      const mockDetail = {
        profile: { id: "p1", full_name: "Test User", email: "test@example.com", plan_tier: "free" },
        cards: [],
        connections_count: 3,
        product_activity: [],
        audit: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDetail,
        error: null,
      } as never);

      const res = await getUserDetail("u123");
      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_user_detail", {
        _user_id: "u123",
      });
      expect(res.data).toEqual(mockDetail);
    });
  });

  describe("Audited mutation RPC wrappers", () => {
    it("adminSetEntitlement passes reason and updates plan_tier", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminSetEntitlement({
        userId: "u123",
        planTier: "pro",
        reason: "Customer support ticket #42 upgrade",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_set_entitlement", {
        _user_id: "u123",
        _plan_tier: "pro",
        _reason: "Customer support ticket #42 upgrade",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });

    it("adminSetCardActive passes reason and toggles active state", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminSetCardActive({
        cardId: "c123",
        isActive: true,
        reason: "Activated on owner request",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_set_card_active", {
        _card_id: "c123",
        _is_active: true,
        _reason: "Activated on owner request",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });

    it("adminDeleteCard passes confirmation slug and reason", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminDeleteCard({
        cardId: "c123",
        confirmationSlug: "john-doe",
        reason: "Owner requested card deletion",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_delete_card", {
        _card_id: "c123",
        _confirmation_slug: "john-doe",
        _reason: "Owner requested card deletion",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });

    it("adminDeleteProfile passes confirmation email and reason", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminDeleteProfile({
        profileId: "p123",
        confirmationEmail: "john@example.com",
        reason: "Account closure request",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_delete_profile", {
        _profile_id: "p123",
        _confirmation_email: "john@example.com",
        _reason: "Account closure request",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });

    it("adminProvisionNfcTag calls admin_provision_nfc_tag_audited with release identifier", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { token: "jt_tag_test123", status: "unassigned" },
        error: null,
      } as never);

      const res = await adminProvisionNfcTag({
        cardId: "c123",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_provision_nfc_tag_audited", {
        _card_id: "c123",
        _release_identifier: "testing-phase2",
      });
      expect(res.data?.token).toBe("jt_tag_test123");
    });

    it("adminAssignNfcTag calls admin_assign_nfc_tag_audited", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminAssignNfcTag({
        token: "jt_tag_test123",
        cardId: "c123",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_assign_nfc_tag_audited", {
        _token: "jt_tag_test123",
        _card_id: "c123",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });

    it("adminUpdateTagStatus calls admin_update_tag_status_audited", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as never);

      const res = await adminUpdateTagStatus({
        token: "jt_tag_test123",
        status: "revoked",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_tag_status_audited", {
        _token: "jt_tag_test123",
        _status: "revoked",
        _release_identifier: "testing-phase2",
      });
      expect(res.success).toBe(true);
    });
  });
});
