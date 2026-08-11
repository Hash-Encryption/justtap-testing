import { describe, expect, it } from "vitest";
import { publicCardRouteData } from "./public-card-route";
import { resolvePublicCardBySlug } from "./public-card";
import { makePublicCardRow } from "./public-card.test-fixture";

describe("/c/:slug route result mapping", () => {
  it("maps /c/known-card to the resolved card", async () => {
    const result = await resolvePublicCardBySlug("known-card", async () => ({
      data: makePublicCardRow(),
      error: null,
    }));
    expect(publicCardRouteData(result).card.slug).toBe("known-card");
  });

  it("maps /c/not-real to TanStack not-found behavior", async () => {
    const result = await resolvePublicCardBySlug("not-real", async () => ({
      data: null,
      error: null,
    }));
    expect(() => publicCardRouteData(result)).toThrowError(
      expect.objectContaining({ isNotFound: true }),
    );
  });

  it("maps a query failure to a service error rather than not-found", () => {
    expect(() => publicCardRouteData({ status: "service_error" })).toThrow(
      "Public card service is temporarily unavailable",
    );
  });
});
