import { describe, expect, it, vi } from "vitest";
import { resolvePublicCardBySlug } from "./public-card";
import { makePublicCardRow } from "./public-card.test-fixture";

describe("public card resolver", () => {
  it("returns an active card through a narrow public model", async () => {
    const lookup = vi.fn(async () => ({ data: makePublicCardRow(), error: null }));
    const result = await resolvePublicCardBySlug("KNOWN-CARD", lookup);

    expect(lookup).toHaveBeenCalledWith("known-card");
    expect(result.status).toBe("found");
    if (result.status !== "found") return;

    expect(result.card.public_features_enabled).toBe(true);
    expect(result.card.show_branding).toBe(false);
    expect(result.card.public_features).toMatchObject({ video_url: "https://example.com/video" });
    expect(result.card).not.toHaveProperty("plan_tier");
    expect(result.card).not.toHaveProperty("is_active");
    expect(result.card).not.toHaveProperty("user_id");
    expect(result.card.public_features).not.toHaveProperty("notify_email");
    expect(result.card.public_features).not.toHaveProperty("webhook_url");
  });

  it("returns not_found when no card matches", async () => {
    const result = await resolvePublicCardBySlug("not-real", async () => ({
      data: null,
      error: null,
    }));
    expect(result).toEqual({ status: "not_found" });
  });

  it("does not return an inactive card", async () => {
    const result = await resolvePublicCardBySlug("known-card", async () => ({
      data: makePublicCardRow({ is_active: false }),
      error: null,
    }));
    expect(result).toEqual({ status: "inactive" });
  });

  it("does not expose unpublished Pro content for a free card", async () => {
    const result = await resolvePublicCardBySlug("known-card", async () => ({
      data: makePublicCardRow({ plan_tier: "free" }),
      error: null,
    }));
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.card.public_features_enabled).toBe(false);
    expect(result.card.public_features).toBeNull();
    expect(result.card.show_branding).toBe(true);
  });

  it("distinguishes a Supabase failure from a missing card", async () => {
    const onServiceError = vi.fn();
    const result = await resolvePublicCardBySlug(
      "known-card",
      async () => ({ data: null, error: { code: "PGRST000", message: "network failure" } }),
      { onServiceError },
    );
    expect(result).toEqual({ status: "service_error" });
    expect(onServiceError).toHaveBeenCalledOnce();
  });
});
