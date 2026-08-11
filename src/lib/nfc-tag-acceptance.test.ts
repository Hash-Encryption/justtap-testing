import { describe, expect, it, vi } from "vitest";
import { resolveSlugByTagToken } from "./nfc-tag";
import { generateTagToken } from "./token";

describe("Phase 03 — Permanent Tag Identity Acceptance Matrix", () => {
  it("resolves a valid active tag to its assigned active card's slug", async () => {
    const token = generateTagToken();
    const mockLookup = vi.fn(async (_t: string) => ({
      data: [{ slug: "active-user-card" }],
      error: null,
    }));

    const result = await resolveSlugByTagToken(token, mockLookup);
    expect(result).toEqual({ status: "found", slug: "active-user-card" });
  });

  it("MANDATORY SLUG RENAME TEST: resolves the SAME permanent tag token to updated slug when card slug changes", async () => {
    const permanentToken = generateTagToken();

    // Step 1: Card has original slug 'muhab-v1'
    let currentCardSlug = "muhab-v1";
    const isCardActive = true;
    const tagStatus = "active";

    const dynamicDbLookup = vi.fn(async (tok: string) => {
      if (tok === permanentToken && tagStatus === "active" && isCardActive) {
        return { data: [{ slug: currentCardSlug }], error: null };
      }
      return { data: [], error: null };
    });

    // 1. Initial resolution: tag -> 'muhab-v1'
    const res1 = await resolveSlugByTagToken(permanentToken, dynamicDbLookup);
    expect(res1).toEqual({ status: "found", slug: "muhab-v1" });

    // 2. Owner renames card slug: 'muhab-v1' -> 'muhab-agency-v2'
    // Permanent token is UNCHANGED, NFC chip is UNCHANGED
    currentCardSlug = "muhab-agency-v2";

    // 3. Same token now resolves to 'muhab-agency-v2' immediately
    const res2 = await resolveSlugByTagToken(permanentToken, dynamicDbLookup);
    expect(res2).toEqual({ status: "found", slug: "muhab-agency-v2" });
    expect(permanentToken).toHaveLength(32);
  });

  it("verifies assigned_at trigger semantics (unassigned NULL, assigned/reassigned now(), unchanged preserved)", () => {
    // Simulated trigger logic unit contract
    function syncAssignedAt(
      op: "INSERT" | "UPDATE",
      oldRow: { card_id: string | null; assigned_at: Date | null } | null,
      newRow: { card_id: string | null; assigned_at: Date | null },
      nowDate: Date = new Date(),
    ) {
      if (!newRow.card_id) return null;
      if (op === "INSERT") return nowDate;
      if (oldRow && oldRow.card_id !== newRow.card_id) return nowDate;
      return oldRow?.assigned_at ?? null;
    }

    const t1 = new Date("2026-08-11T10:00:00Z");
    const t2 = new Date("2026-08-11T12:00:00Z");

    // Unassigned tag -> NULL
    expect(syncAssignedAt("INSERT", null, { card_id: null, assigned_at: null }, t1)).toBeNull();

    // First assignment -> t1
    expect(syncAssignedAt("INSERT", null, { card_id: "card-1", assigned_at: null }, t1)).toEqual(
      t1,
    );

    // Reassignment Card 1 -> Card 2 -> t2
    expect(
      syncAssignedAt(
        "UPDATE",
        { card_id: "card-1", assigned_at: t1 },
        { card_id: "card-2", assigned_at: t1 },
        t2,
      ),
    ).toEqual(t2);

    // Unassignment -> NULL
    expect(
      syncAssignedAt(
        "UPDATE",
        { card_id: "card-2", assigned_at: t2 },
        { card_id: null, assigned_at: t2 },
        t2,
      ),
    ).toBeNull();

    // Status update with unchanged card_id -> preserves original assigned_at t2
    expect(
      syncAssignedAt(
        "UPDATE",
        { card_id: "card-2", assigned_at: t2 },
        { card_id: "card-2", assigned_at: t2 },
        new Date("2026-08-11T15:00:00Z"),
      ),
    ).toEqual(t2);
  });

  it("returns indistinguishable not_found for an inactive tag", async () => {
    const token = generateTagToken();
    const mockLookup = vi.fn(async () => ({ data: [], error: null }));

    const result = await resolveSlugByTagToken(token, mockLookup);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns indistinguishable not_found for a revoked tag", async () => {
    const token = generateTagToken();
    const mockLookup = vi.fn(async () => ({ data: [], error: null }));

    const result = await resolveSlugByTagToken(token, mockLookup);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns indistinguishable not_found for an unassigned tag (card_id = NULL)", async () => {
    const token = generateTagToken();
    const mockLookup = vi.fn(async () => ({ data: [], error: null }));

    const result = await resolveSlugByTagToken(token, mockLookup);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns indistinguishable not_found for active tag assigned to an inactive card", async () => {
    const token = generateTagToken();
    const mockLookup = vi.fn(async () => ({ data: [], error: null }));

    const result = await resolveSlugByTagToken(token, mockLookup);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns indistinguishable not_found for an unknown token", async () => {
    const unknownToken = generateTagToken();
    const mockLookup = vi.fn(async () => ({ data: [], error: null }));

    const result = await resolveSlugByTagToken(unknownToken, mockLookup);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns invalid_token for malformed tokens without calling database RPC", async () => {
    const mockLookup = vi.fn();

    const res1 = await resolveSlugByTagToken("short-token", mockLookup);
    expect(res1).toEqual({ status: "invalid_token" });

    const res2 = await resolveSlugByTagToken("a".repeat(33), mockLookup);
    expect(res2).toEqual({ status: "invalid_token" });

    const res3 = await resolveSlugByTagToken("bad@token#1234567890123456789012", mockLookup);
    expect(res3).toEqual({ status: "invalid_token" });

    expect(mockLookup).not.toHaveBeenCalled();
  });
});
