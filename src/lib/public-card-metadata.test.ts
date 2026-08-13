import { describe, expect, it } from "vitest";
import { buildPublicCardHead, resolvePublicOrigin } from "./public-card-metadata";

const card = {
  slug: "renamed-current-slug",
  full_name: "Metadata Person",
  title: "Founder",
  bio: "Current public profile",
  company: "JustTap",
};

describe("public card SSR metadata", () => {
  it("emits absolute canonical, OpenGraph, Twitter, and image-alt values for the current slug", () => {
    const head = buildPublicCardHead(card, "https://cards.example.com");
    const byProperty = Object.fromEntries(
      head.meta.filter((item) => "property" in item).map((item) => [item.property, item.content]),
    );
    const byName = Object.fromEntries(
      head.meta.filter((item) => "name" in item).map((item) => [item.name, item.content]),
    );

    expect(head.links).toEqual([
      { rel: "canonical", href: "https://cards.example.com/c/renamed-current-slug" },
    ]);
    expect(byProperty["og:url"]).toBe("https://cards.example.com/c/renamed-current-slug");
    expect(byProperty["og:image"]).toBe("https://cards.example.com/api/og/renamed-current-slug");
    expect(byProperty["og:image:alt"]).toContain("Metadata Person");
    expect(byName["twitter:image"]).toBe("https://cards.example.com/api/og/renamed-current-slug");
  });

  it("uses configured origins and only permits known-safe request-origin fallbacks", () => {
    expect(resolvePublicOrigin("https://justtap.example", "https://ignored.example/path")).toBe(
      "https://justtap.example",
    );
    expect(
      resolvePublicOrigin(
        undefined,
        "https://v2-07-public-card-renderer.justtap-v2-staging.pages.dev/c/test",
      ),
    ).toBe("https://v2-07-public-card-renderer.justtap-v2-staging.pages.dev");
    expect(resolvePublicOrigin(undefined, "http://127.0.0.1:3000/c/test")).toBe(
      "http://127.0.0.1:3000",
    );
    expect(() => resolvePublicOrigin(undefined, "https://attacker.example/c/test")).toThrow(
      "VITE_PUBLIC_SITE_URL",
    );
  });
});
