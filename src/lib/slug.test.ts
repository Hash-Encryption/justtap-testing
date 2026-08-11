import { describe, expect, it } from "vitest";
import { normalizeSlug, SLUG_MAX_LENGTH, validateSlug } from "./slug";

describe("slug normalization and validation", () => {
  it("accepts a valid lowercase slug", () => {
    expect(validateSlug("muhab-card")).toEqual({ valid: true, slug: "muhab-card" });
  });

  it("normalizes uppercase and whitespace predictably", () => {
    expect(normalizeSlug("  Muhab   Card  ")).toBe("muhab-card");
    expect(validateSlug("  Muhab   Card  ")).toEqual({ valid: true, slug: "muhab-card" });
  });

  it("rejects unsupported characters instead of silently deleting them", () => {
    expect(validateSlug("muhab!card")).toMatchObject({ valid: false, reason: "invalid" });
  });

  it("rejects an empty slug", () => {
    expect(validateSlug("   ")).toMatchObject({ valid: false, reason: "empty" });
  });

  it("rejects a slug beyond the maximum length", () => {
    expect(validateSlug("a".repeat(SLUG_MAX_LENGTH + 1))).toMatchObject({
      valid: false,
      reason: "too_long",
    });
  });
});
