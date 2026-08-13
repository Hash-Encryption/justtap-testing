import { describe, expect, it, vi } from "vitest";
import { emptyCard, type Card } from "./card";
import {
  applyCardDraft,
  canPersistCardDraft,
  CARD_DRAFT_TTL_MS,
  clearCardDraft,
  getCardDraftId,
  getCardDraftKey,
  migrateLegacyCardDraft,
  readCardDraft,
  reconcileCardDraftAfterSave,
  recoverNewerCardDraft,
  writeCardDraft,
  type DraftStorage,
} from "./card-draft";

function memoryStorage(): DraftStorage & { has(key: string): boolean } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

function card(id: string, userId: string, fullName: string): Card {
  return { ...emptyCard, id, user_id: userId, full_name: fullName, phone: "0500000000" };
}

describe("CardEditor local recovery drafts", () => {
  it("writes unsaved text to an isolated user/card key and survives navigation or remount", () => {
    const storage = memoryStorage();
    const edited = card("card-a", "user-a", "Unsaved Name");

    writeCardDraft(storage, "user-a", edited, 1_000);
    const remounted = readCardDraft(storage, "user-a", "card-a", 2_000);

    expect(storage.has("justtap:v2:draft:user-a:card-a")).toBe(true);
    expect(applyCardDraft(card("card-a", "user-a", "Server Name"), remounted!)).toMatchObject({
      id: "card-a",
      user_id: "user-a",
      full_name: "Unsaved Name",
    });
  });

  it("keeps newer in-memory edits on tab return and restores newer browser work", () => {
    const storage = memoryStorage();
    const memory = card("card-a", "user-a", "Memory");
    const stored = writeCardDraft(storage, "user-a", card("card-a", "user-a", "Storage"), 2_000);

    expect(recoverNewerCardDraft(memory, 3_000, stored)).toEqual({
      card: memory,
      updatedAt: 3_000,
      restored: false,
    });
    expect(recoverNewerCardDraft(memory, 1_000, stored)).toMatchObject({
      card: { full_name: "Storage" },
      updatedAt: 2_000,
      restored: true,
    });
  });

  it("prevents initial state from persisting before exact-key hydration", () => {
    expect(canPersistCardDraft(null, "draft-key", true)).toBe(false);
    expect(canPersistCardDraft("other-key", "draft-key", true)).toBe(false);
    expect(canPersistCardDraft("draft-key", "draft-key", true)).toBe(true);
    expect(canPersistCardDraft("draft-key", "draft-key", false)).toBe(false);
  });

  it("clears recovery only after a successful server save", () => {
    const storage = memoryStorage();
    const edited = card("card-a", "user-a", "Unsaved");
    writeCardDraft(storage, "user-a", edited, 1_000);

    reconcileCardDraftAfterSave(storage, "user-a", "card-a", false);
    expect(readCardDraft(storage, "user-a", "card-a", 2_000)).not.toBeNull();

    reconcileCardDraftAfterSave(storage, "user-a", "card-a", true);
    expect(readCardDraft(storage, "user-a", "card-a", 2_000)).toBeNull();
  });

  it("refreshes a three-day TTL and removes expired drafts without overriding server state", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const server = card("card-a", "user-a", "Server");
    const now = new Date("2026-08-13T00:00:00Z");
    vi.setSystemTime(now);

    const first = writeCardDraft(storage, "user-a", card("card-a", "user-a", "First"));
    vi.advanceTimersByTime(CARD_DRAFT_TTL_MS - 1_000);
    const refreshed = writeCardDraft(storage, "user-a", card("card-a", "user-a", "Latest"));
    expect(refreshed.expiresAt).toBeGreaterThan(first.expiresAt);

    vi.advanceTimersByTime(CARD_DRAFT_TTL_MS + 1);
    const expired = readCardDraft(storage, "user-a", "card-a");
    expect(expired).toBeNull();
    expect(recoverNewerCardDraft(server, 0, expired).card.full_name).toBe("Server");
    expect(storage.has(getCardDraftKey("user-a", "card-a"))).toBe(false);
    vi.useRealTimers();
  });

  it("never restores another card or user's draft", () => {
    const storage = memoryStorage();
    writeCardDraft(storage, "user-a", card("card-a", "user-a", "Private"), 1_000);

    expect(readCardDraft(storage, "user-a", "card-b", 2_000)).toBeNull();
    expect(readCardDraft(storage, "user-b", "card-a", 2_000)).toBeNull();
  });

  it("rejects malformed or authority-bearing stored payloads", () => {
    const storage = memoryStorage();
    const key = getCardDraftKey("user-a", "card-a");
    const valid = writeCardDraft(storage, "user-a", card("card-a", "user-a", "Valid"), 1_000);

    storage.setItem(
      key,
      JSON.stringify({ ...valid, fields: { ...valid.fields, user_id: "user-b" } }),
    );
    expect(readCardDraft(storage, "user-a", "card-a", 2_000)).toBeNull();
    expect(storage.has(key)).toBe(false);

    storage.setItem(key, "not-json");
    expect(readCardDraft(storage, "user-a", "card-a", 2_000)).toBeNull();
  });

  it("isolates guest and new-card drafts from authenticated card drafts", () => {
    expect(getCardDraftKey("guest", getCardDraftId("guest", emptyCard))).toBe(
      "justtap:v2:guest-draft:builder",
    );
    expect(getCardDraftKey("user-a", getCardDraftId("user-a", emptyCard))).toBe(
      "justtap:v2:draft:user-a:new",
    );
    expect(getCardDraftKey("guest", "builder")).not.toBe(getCardDraftKey("user-a", "builder"));
  });

  it("migrates only an exact matching legacy user/card draft", () => {
    const storage = memoryStorage();
    const server = card("card-a", "user-a", "Server");
    storage.setItem(
      "justtap_card_draft_user-a",
      JSON.stringify({ card: { ...server, full_name: "Legacy" }, updatedAt: 1_000 }),
    );

    expect(migrateLegacyCardDraft(storage, "user-a", server, 2_000)?.fields.full_name).toBe(
      "Legacy",
    );
    expect(storage.has("justtap_card_draft_user-a")).toBe(false);
    expect(readCardDraft(storage, "user-a", "card-a", 2_000)?.fields.full_name).toBe("Legacy");

    storage.setItem(
      "justtap_card_draft_user-a",
      JSON.stringify({ card: card("card-b", "user-a", "Wrong card"), updatedAt: 3_000 }),
    );
    expect(migrateLegacyCardDraft(storage, "user-a", server, 4_000)).toBeNull();
    expect(storage.has("justtap_card_draft_user-a")).toBe(true);
    expect(
      migrateLegacyCardDraft(storage, "user-a", card("card-b", "user-a", "Server B"), 4_000)?.fields
        .full_name,
    ).toBe("Wrong card");
  });

  it("does not persist authority fields or raw image data", () => {
    const storage = memoryStorage();
    const unsafe: Card = {
      ...card("card-a", "user-a", "Draft"),
      plan_tier: "enterprise",
      is_active: false,
      avatar_url: "data:image/png;base64,large",
      logo_url: "https://cdn.example.com/logo.png",
    };

    const stored = writeCardDraft(storage, "user-a", unsafe, 1_000);
    expect(stored.fields).not.toHaveProperty("plan_tier");
    expect(stored.fields).not.toHaveProperty("is_active");
    expect(stored.fields.avatar_url).toBeNull();
    expect(stored.fields.logo_url).toBe("https://cdn.example.com/logo.png");
    expect(applyCardDraft(card("card-a", "user-a", "Server"), stored)).toMatchObject({
      id: "card-a",
      user_id: "user-a",
    });

    clearCardDraft(storage, "user-a", "card-a");
    expect(storage.has(getCardDraftKey("user-a", "card-a"))).toBe(false);
  });
});
