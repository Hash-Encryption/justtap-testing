import { describe, expect, it } from "vitest";
import { saveCardRecord, type CardSaveGateway } from "./card-save";
import { formatAuthErrorMessage, validateRedirectUrl } from "./auth";

describe("Phase 04 Auth & Account Model Foundation", () => {
  describe("Redirect URL Sanitization (Open Redirect Prevention)", () => {
    it("accepts valid internal application paths", () => {
      expect(validateRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(validateRedirectUrl("/dashboard?tab=leads")).toBe("/dashboard?tab=leads");
      expect(validateRedirectUrl("/c/my-card")).toBe("/c/my-card");
    });

    it("rejects open redirect attempts and falls back to /dashboard", () => {
      expect(validateRedirectUrl("https://evil.com")).toBe("/dashboard");
      expect(validateRedirectUrl("http://attacker.com/login")).toBe("/dashboard");
      expect(validateRedirectUrl("//evil.com")).toBe("/dashboard");
      expect(validateRedirectUrl("/\\evil.com")).toBe("/dashboard");
      expect(validateRedirectUrl(null)).toBe("/dashboard");
      expect(validateRedirectUrl(undefined)).toBe("/dashboard");
    });
  });

  describe("Auth Error Formatting", () => {
    it("formats standard auth error messages cleanly", () => {
      expect(formatAuthErrorMessage(new Error("Invalid login credentials"))).toBe(
        "Invalid email or password.",
      );
      expect(formatAuthErrorMessage(new Error("User already registered"))).toBe(
        "An account with this email already exists.",
      );
      expect(formatAuthErrorMessage(new Error("Custom auth failure"))).toBe("Custom auth failure");
    });
  });

  describe("User A / User B Isolation & Ownership Verification", () => {
    it("ensures CardEditor saveCardRecord enforces exact user_id match on updates", async () => {
      const userAId = "user-a-1111-1111-1111-111111111111";
      const userBId = "user-b-2222-2222-2222-222222222222";

      let updateAttemptedWithOwnerId = "";

      const mockGateway: CardSaveGateway<{ id: string; user_id: string; slug: string }> = {
        async insert() {
          return { data: null, error: { message: "Not expected" } };
        },
        async update(cardId, ownerId, payload) {
          updateAttemptedWithOwnerId = ownerId;
          if (ownerId !== userAId) {
            return {
              data: null,
              error: { code: "42501", message: "permission denied for table cards" },
            };
          }
          return {
            data: { id: cardId, user_id: ownerId, slug: String(payload.slug) },
            error: null,
          };
        },
      };

      // User A updating User A's card -> SUCCESS
      const resA = await saveCardRecord(
        {
          isNew: false,
          cardId: "card-a-id",
          userId: userAId,
          payload: { slug: "card-a-slug" },
        },
        mockGateway,
      );

      expect(resA.status).toBe("saved");
      expect(updateAttemptedWithOwnerId).toBe(userAId);

      // User B attempting to update User A's card -> REJECTED BY GATEWAY/RLS
      const resB = await saveCardRecord(
        {
          isNew: false,
          cardId: "card-a-id",
          userId: userBId, // User B claiming ownership
          payload: { slug: "card-a-slug" },
        },
        mockGateway,
      );

      expect(resB.status).toBe("service_error");
      expect(updateAttemptedWithOwnerId).toBe(userBId);
    });
  });
});
