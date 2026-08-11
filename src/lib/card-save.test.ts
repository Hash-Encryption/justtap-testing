import { describe, expect, it } from "vitest";
import { saveCardRecord, type CardSaveGateway } from "./card-save";
import { resolvePublicCardBySlug } from "./public-card";
import { makePublicCardRow, type PublicCardTestRow } from "./public-card.test-fixture";

describe("card save and immediate public resolution", () => {
  it("persists a normalized new slug that resolves immediately", async () => {
    const rows = new Map<string, PublicCardTestRow>();
    const gateway: CardSaveGateway<PublicCardTestRow> = {
      async insert(payload) {
        const row = makePublicCardRow({ slug: String(payload.slug) });
        rows.set(row.slug, row);
        return { data: row, error: null };
      },
      async update() {
        throw new Error("not used");
      },
    };

    const saved = await saveCardRecord(
      { isNew: true, cardId: "", userId: "owner", payload: { slug: "New Card" } },
      gateway,
    );
    expect(saved.status).toBe("saved");

    const resolved = await resolvePublicCardBySlug("new-card", async (slug) => ({
      data: rows.get(slug) ?? null,
      error: null,
    }));
    expect(resolved.status).toBe("found");
  });

  it("updates the authoritative slug so the old URL stops resolving", async () => {
    const original = makePublicCardRow({ slug: "old-card" });
    const rows = new Map([[original.slug, original]]);
    const gateway: CardSaveGateway<PublicCardTestRow> = {
      async insert() {
        throw new Error("not used");
      },
      async update(cardId, _userId, payload) {
        rows.delete("old-card");
        const row = makePublicCardRow({ id: cardId, slug: String(payload.slug) });
        rows.set(row.slug, row);
        return { data: row, error: null };
      },
    };

    const saved = await saveCardRecord(
      {
        isNew: false,
        cardId: original.id,
        userId: "owner",
        payload: { slug: "Changed Card" },
      },
      gateway,
    );
    expect(saved.status).toBe("saved");

    const lookup = async (slug: string) => ({ data: rows.get(slug) ?? null, error: null });
    await expect(resolvePublicCardBySlug("changed-card", lookup)).resolves.toMatchObject({
      status: "found",
    });
    await expect(resolvePublicCardBySlug("old-card", lookup)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("translates the database unique violation into duplicate_slug", async () => {
    const gateway: CardSaveGateway<PublicCardTestRow> = {
      async insert() {
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      },
      async update() {
        throw new Error("not used");
      },
    };

    await expect(
      saveCardRecord(
        { isNew: true, cardId: "", userId: "owner", payload: { slug: "known-card" } },
        gateway,
      ),
    ).resolves.toEqual({ status: "duplicate_slug" });
  });
});
