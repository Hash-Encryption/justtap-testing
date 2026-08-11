export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 48;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SlugValidationResult =
  | { valid: true; slug: string }
  | { valid: false; slug: string; reason: "empty" | "too_short" | "too_long" | "invalid" };

/**
 * Canonical normalization for card URLs. It intentionally preserves unsupported
 * characters so validation can reject them instead of silently changing identity.
 */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function validateSlug(input: string): SlugValidationResult {
  const slug = normalizeSlug(input);

  if (!slug) return { valid: false, slug, reason: "empty" };
  if (slug.length < SLUG_MIN_LENGTH) return { valid: false, slug, reason: "too_short" };
  if (slug.length > SLUG_MAX_LENGTH) return { valid: false, slug, reason: "too_long" };
  if (!SLUG_PATTERN.test(slug)) return { valid: false, slug, reason: "invalid" };

  return { valid: true, slug };
}

export function slugValidationMessage(result: Exclude<SlugValidationResult, { valid: true }>) {
  switch (result.reason) {
    case "empty":
      return "A card URL is required.";
    case "too_short":
      return `The card URL must be at least ${SLUG_MIN_LENGTH} characters.`;
    case "too_long":
      return `The card URL must be ${SLUG_MAX_LENGTH} characters or fewer.`;
    case "invalid":
      return "Use only lowercase letters, numbers, and single hyphens in the card URL.";
  }
}
