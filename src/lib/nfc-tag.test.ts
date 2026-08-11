import { describe, expect, it, vi } from "vitest";
import { generateTagToken, validateTagToken, TAG_TOKEN_REGEX } from "./token";
import { resolveSlugByTagToken } from "./nfc-tag";

describe("Permanent NFC Tag Token Infrastructure", () => {
  describe("token generation & validation", () => {
    it("generates a 32-character URL-safe token matching ^[A-Za-z0-9_-]{32}$", () => {
      const token = generateTagToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(TAG_TOKEN_REGEX);
      expect(validateTagToken(token)).toBe(true);
    });

    it("generates unique high-entropy tokens", () => {
      const tokens = new Set(Array.from({ length: 50 }, () => generateTagToken()));
      expect(tokens.size).toBe(50);
    });

    it("validates correct 32-char base64url tokens", () => {
      expect(validateTagToken("AbCdEfGhIjKlMnOpQrStUvWxYz012345")).toBe(true);
      expect(validateTagToken("--------------------------------")).toBe(true);
      expect(validateTagToken("________________________________")).toBe(true);
    });

    it("rejects invalid token formats", () => {
      expect(validateTagToken("short")).toBe(false);
      expect(validateTagToken("a".repeat(31))).toBe(false);
      expect(validateTagToken("a".repeat(33))).toBe(false);
      expect(validateTagToken("AbCdEfGhIjKlMnOpQrStUvWxYz01234!")).toBe(false); // invalid char !
      expect(validateTagToken("")).toBe(false);
      expect(validateTagToken(null)).toBe(false);
      expect(validateTagToken(undefined)).toBe(false);
    });
  });

  describe("resolveSlugByTagToken pure resolver", () => {
    it("resolves active valid tag to target card slug", async () => {
      const lookup = vi.fn(async () => ({ data: { slug: "target-card-slug" }, error: null }));
      const validToken = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
      const result = await resolveSlugByTagToken(validToken, lookup);

      expect(lookup).toHaveBeenCalledWith(validToken);
      expect(result).toEqual({ status: "found", slug: "target-card-slug" });
    });

    it("returns invalid_token for malformed tokens without calling DB lookup", async () => {
      const lookup = vi.fn();
      const result = await resolveSlugByTagToken("bad-token", lookup);

      expect(lookup).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "invalid_token" });
    });

    it("returns indistinguishable not_found for empty query response", async () => {
      const lookup = vi.fn(async () => ({ data: [], error: null }));
      const token = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
      const result = await resolveSlugByTagToken(token, lookup);

      expect(result).toEqual({ status: "not_found" });
    });

    it("returns indistinguishable not_found for null response", async () => {
      const lookup = vi.fn(async () => ({ data: null, error: null }));
      const token = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
      const result = await resolveSlugByTagToken(token, lookup);

      expect(result).toEqual({ status: "not_found" });
    });

    it("returns service_error on database failure and invokes diagnostic logger", async () => {
      const onServiceError = vi.fn();
      const lookup = vi.fn(async () => ({
        data: null,
        error: { code: "PGRST000", message: "DB timeout" },
      }));
      const token = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
      const result = await resolveSlugByTagToken(token, lookup, { onServiceError });

      expect(result).toEqual({ status: "service_error" });
      expect(onServiceError).toHaveBeenCalledOnce();
    });
  });
});
