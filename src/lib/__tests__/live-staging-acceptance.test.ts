import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";

const STAGING_BASE = "https://v2-06-dashboard-cardeditor-e.justtap-v2-staging.pages.dev";
const HTML_HEADERS = { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };

describe("Live Cloudflare Staging Acceptance Suite", () => {
  it("verifies homepage resolves on staging (200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/`, { headers: HTML_HEADERS, redirect: "manual" });
    expect(res.status).toBe(200);
  });

  it("verifies admin portal shell resolves on staging with Phase 05 NFC assets (200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/admin`, { headers: HTML_HEADERS, redirect: "manual" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Admin portal");
  });

  it("verifies auth page resolves on staging (200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/auth`, { headers: HTML_HEADERS, redirect: "manual" });
    expect(res.status).toBe(200);
  });

  it("verifies unauthenticated /dashboard returns 200 shell WITHOUT any private owner data", async () => {
    const res = await fetch(`${STAGING_BASE}/dashboard`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(res.status).toBe(200);

    const htmlText = await res.text();

    // Verify HTML shell is generic and contains NO private user emails, user names, or cards
    expect(htmlText).not.toContain("phase04_usera@justtap.test");
    expect(htmlText).not.toContain("phase04_userb@justtap.test");
    expect(htmlText).not.toContain("testing-admin@example.com");
    expect(htmlText).not.toContain("User A Real Card");
    expect(htmlText).toContain("Dashboard");
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

  it("verifies LIVE end-to-end admin tag provisioning, assignment, and live staging resolution", async () => {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 1. Admin Sign-In
    const { data: authData, error: authErr } = await adminClient.auth.signInWithPassword({
      email: "hgendi3@gmail.com",
      password: "Admin.Hash.9",
    });
    expect(authErr).toBeNull();
    expect(authData.user).not.toBeNull();

    // 2. Admin provisions tag (server CSPRNG token generated)
    const { data: provData, error: provErr } = await adminClient.rpc("admin_provision_nfc_tag");
    expect(provErr).toBeNull();
    expect(provData).not.toBeNull();

    const provTag = Array.isArray(provData) ? provData[0] : provData;
    const liveToken = provTag.token;

    console.log("Live Staging Acceptance provisioned tag token:", liveToken);
    expect(liveToken).toMatch(/^[A-Za-z0-9_-]{32}$/);

    // 3. Find testing-admin card id
    const { data: cardData } = await adminClient
      .from("cards")
      .select("id")
      .eq("slug", "testing-admin")
      .single();
    expect(cardData).not.toBeNull();

    // 4. Assign liveToken to testing-admin card
    const { error: assignErr } = await adminClient.rpc("admin_assign_nfc_tag", {
      _token: liveToken,
      _card_id: cardData!.id,
    });
    expect(assignErr).toBeNull();

    // 5. Test LIVE Cloudflare Staging HTTP redirect on /t/:token -> /c/testing-admin
    const stagingTagRes = await fetch(`${STAGING_BASE}/t/${liveToken}`, {
      redirect: "manual",
    });
    expect([301, 302, 307, 308]).includes(stagingTagRes.status);
    expect(stagingTagRes.headers.get("location")).toBe("/c/testing-admin");

    // 6. Revoke token and verify LIVE Cloudflare Staging returns 404
    const { error: revokeErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: liveToken,
      _status: "revoked",
    });
    expect(revokeErr).toBeNull();

    const revokedRes = await fetch(`${STAGING_BASE}/t/${liveToken}`, {
      headers: HTML_HEADERS,
      redirect: "manual",
    });
    expect(revokedRes.status).toBe(404);
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

  it("verifies vCard route resolves on staging (/api/vcard/testing-admin -> 200 OK)", async () => {
    const res = await fetch(`${STAGING_BASE}/api/vcard/testing-admin`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/vcard");
  });
});
