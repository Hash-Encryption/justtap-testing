import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public card architecture", () => {
  it("does not rediscover the slug or load cards from browser storage", () => {
    const route = readFileSync(new URL("../routes/c.$slug.tsx", import.meta.url), "utf8");
    const renderer = readFileSync(
      new URL("../components/card/CardView.tsx", import.meta.url),
      "utf8",
    );
    const activeSource = `${route}\n${renderer}`;

    expect(activeSource).not.toContain("URLSearchParams");
    expect(activeSource).not.toContain("window.location.pathname");
    expect(activeSource).not.toContain("localStorage");
    expect(route).not.toContain('.from("cards")');
    expect(route).not.toContain('select("*")');
  });

  it("has no legacy public-card route or c.html redirect", () => {
    expect(existsSync(new URL("../../app/c/page.tsx", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../../app/c/[slug]/page.tsx", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../../public/_redirects", import.meta.url))).toBe(false);
  });

  it("uses CardView as the single editor and public visual renderer", () => {
    const preview = readFileSync(
      new URL("../components/card/CardPreview.tsx", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("<CardView card={card} preview />");
    expect(preview).not.toContain("header_pattern");
  });
});
