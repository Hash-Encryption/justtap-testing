import { describe, expect, it } from "vitest";

const STAGING_BASE = "https://b7e248e8.justtap-v2-staging.pages.dev";
const HTML_HEADERS = { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };

describe("Live Cloudflare Staging Acceptance Suite", () => {
  it("verifies homepage resolves on staging (200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/`, { headers: HTML_HEADERS, redirect: "manual" });
    expect(res.status).toBe(200);
  });

  it("verifies auth page resolves on staging (200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/auth`, { headers: HTML_HEADERS, redirect: "manual" });
    expect(res.status).toBe(200);
  });

  it("verifies active public card resolves on staging (/c/testing-admin -> 200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/c/testing-admin`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(res.status).toBe(200);
  });

  it("verifies missing public card returns safe 404 on staging", async () => {
    const res = await fetch(`${STAGING_BASE}/c/non-existent-card-slug-999`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  it("verifies active permanent tag redirects to current slug (/t/:token -> 307 -> /c/testing-admin)", async () => {
    const res = await fetch(`${STAGING_BASE}/t/11112222333344445555666677778888`, {
      redirect: "manual",
    });
    expect([301, 302, 307, 308]).includes(res.status);
    expect(res.headers.get("location")).toBe("/c/testing-admin");
  });

  it("verifies malformed token returns safe 404 on staging", async () => {
    const res = await fetch(`${STAGING_BASE}/t/malformed-short-token`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  it("verifies unknown 32-char token returns safe 404 on staging", async () => {
    const res = await fetch(`${STAGING_BASE}/t/00000000000000000000000000000000`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });
});
