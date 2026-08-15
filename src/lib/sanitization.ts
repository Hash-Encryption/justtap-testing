import { z } from "zod";
import { normalizeSlug, validateSlug } from "./slug";

/**
 * Strips HTML tags, script tags, event attributes (onload, onerror), control characters,
 * and zero-width spaces to prevent XSS injection.
 */
export function sanitizeText(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return "";

  let cleaned = String(input);

  // 1. Remove control characters and zero-width spaces
  const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g; // eslint-disable-line no-control-regex
  cleaned = cleaned.replace(controlCharacters, "");

  // 2. Strip HTML tags completely
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");

  // 3. Escape dangerous characters for safe string context
  cleaned = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  // 4. Enforce maximum length
  return cleaned.trim().slice(0, maxLength);
}

/** Unescapes HTML entities for display in React elements (React automatically escapes JSX). */
export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Validates and sanitizes URLs to ensure they only use http or https protocols.
 * Prevents javascript: or data: pseudoprotocol XSS attacks in links.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // Invalid URL format
  }
  return null;
}

/**
 * Cleans phone numbers to contain only digits, +, hyphens, spaces, and parentheses.
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone
    .replace(/[^\d+()\s-]/g, "")
    .trim()
    .slice(0, 30);
}

/** Zod Schema for visitor lead capture ("Exchange Info" form) */
export const LeadSubmissionSchema = z
  .object({
    card_slug: z
      .string()
      .transform(normalizeSlug)
      .refine((slug) => validateSlug(slug).valid, "Invalid card identifier"),
    sender_name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name is too long")
      .transform((val) => sanitizeText(val, 100))
      .refine((val) => val.length > 0, "Name is required"),
    sender_phone: z
      .string()
      .min(3, "Phone number is required")
      .max(30, "Phone number is too long")
      .transform((val) => sanitizePhone(val))
      .refine((val) => /^\+?[0-9() -]{3,30}$/.test(val), "Invalid phone number"),
    sender_email: z
      .string()
      .trim()
      .max(254, "Email is too long")
      .email("Invalid email format")
      .or(z.literal(""))
      .nullable()
      .optional()
      .transform((val) => val || null),
    sender_company: z
      .string()
      .max(160, "Company is too long")
      .nullable()
      .optional()
      .transform((val) => {
        const clean = sanitizeText(val, 160);
        return clean || null;
      }),
    sender_job_title: z
      .string()
      .max(160, "Job title is too long")
      .nullable()
      .optional()
      .transform((val) => {
        const clean = sanitizeText(val, 160);
        return clean || null;
      }),
    note: z
      .string()
      .max(1000, "Note exceeds maximum limit of 1000 characters")
      .nullable()
      .optional()
      .transform((val) => {
        const clean = sanitizeText(val, 1000);
        return clean || null;
      }),
  })
  .strict();

export type LeadSubmission = z.infer<typeof LeadSubmissionSchema>;

/** Zod Schema for Card profile data */
export const CardValidationSchema = z.object({
  slug: z
    .string()
    .transform(normalizeSlug)
    .refine((slug) => validateSlug(slug).valid, {
      message: "Slug must be 2-48 characters using lowercase letters, numbers, and single hyphens",
    }),
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name too long")
    .transform((v) => sanitizeText(v, 100)),
  phone: z
    .string()
    .min(3, "Phone is required")
    .transform((v) => sanitizePhone(v)),
  email: z.string().email("Invalid email format").or(z.literal("")).nullable().optional(),
  title: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => (v ? sanitizeText(v, 100) : null)),
  company: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => (v ? sanitizeText(v, 100) : null)),
  bio: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .transform((v) => (v ? sanitizeText(v, 1000) : null)),
  avatar_url: z.string().nullable().optional().transform(sanitizeUrl),
  logo_url: z.string().nullable().optional().transform(sanitizeUrl),
});
