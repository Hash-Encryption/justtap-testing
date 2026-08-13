import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PublicCard } from "./public-card";
import { handleWalletRequest, WALLETWALLET_PASSES_ENDPOINT } from "../routes/api/wallet.$slug";

const card: PublicCard = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "known-card",
  full_name: "Known Card",
  phone: "+966500000000",
  email: "public@example.com",
  title: "Founder",
  company: "JustTap",
  bio: null,
  avatar_url: null,
  logo_url: null,
  show_logo_badge: true,
  header_pattern: "wave",
  accent_color: "#6B21A8",
  bg_color: "#08080A",
  design_mode: "classic_v2",
  surface_color: "#121216",
  champagne_accent: "#E6D5AC",
  text_color: "#FAFAFA",
  surface_finish: "matte",
  border_radius: "minimal",
  font_family: "Outfit",
  whatsapp_phone: null,
  whatsapp_message: null,
  enable_arabic: false,
  full_name_ar: null,
  title_ar: null,
  bio_ar: null,
  social_links: { website: "https://example.com" },
  public_features: null,
  public_features_enabled: true,
  show_branding: false,
};

const request = new Request(
  "https://justtap.pages.dev/api/wallet/known-card?token=0123456789abcdef0123456789abcdef",
);
const testWalletKey = ["server", "only", "test", "key"].join("-");
const resolveCard = vi.fn(async () => ({ status: "found" as const, card }));

describe("WalletWallet Apple pass endpoint", () => {
  it("calls WalletWallet server-side and returns the decoded signed pkpass", async () => {
    const pass = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);
    const providerFetch = vi.fn(async () =>
      Response.json({
        serialNumber: "serial-1",
        applePass: Buffer.from(pass).toString("base64"),
        googleSaveUrl: "https://example.com/google",
        shareUrl: "https://example.com/share",
      }),
    );

    const response = await handleWalletRequest("known-card", request, {
      fetch: providerFetch as typeof fetch,
      walletApiKey: testWalletKey,
      resolveCard,
      resolveTagToken: async () => ({ status: "found", slug: "known-card" }),
    });

    expect(providerFetch).toHaveBeenCalledOnce();
    const [endpoint, init] = providerFetch.mock.calls[0];
    expect(endpoint).toBe(WALLETWALLET_PASSES_ENDPOINT);
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer server-only-test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      barcodeValue: "https://justtap.pages.dev/t/0123456789abcdef0123456789abcdef",
      barcodeFormat: "QR",
      primaryFields: [{ label: "NAME", value: "Known Card" }],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.apple.pkpass");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="justtap.pkpass"',
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pass);
  });

  it.each([
    [400, 400, "WALLET_PAYLOAD_INVALID"],
    [401, 503, "WALLET_PROVIDER_AUTH_ERROR"],
    [429, 429, "WALLET_PROVIDER_RATE_LIMIT"],
    [500, 503, "WALLET_PROVIDER_UNAVAILABLE"],
  ])("maps WalletWallet %i safely", async (providerStatus, expectedStatus, code) => {
    const response = await handleWalletRequest("known-card", request, {
      fetch: vi.fn(async () => new Response(null, { status: providerStatus })) as typeof fetch,
      walletApiKey: testWalletKey,
      resolveCard,
    });

    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toMatchObject({ code });
  });

  it("reports missing configuration and network failures without returning a fake pass", async () => {
    const noKey = await handleWalletRequest("known-card", request, {
      walletApiKey: null,
      resolveCard,
    });
    expect(noKey.status).toBe(503);
    expect(await noKey.json()).toMatchObject({ code: "WALLET_PROVIDER_CONFIG_ERROR" });

    const networkFailure = await handleWalletRequest("known-card", request, {
      fetch: vi.fn(async () => {
        throw new Error("network down");
      }) as typeof fetch,
      walletApiKey: testWalletKey,
      resolveCard,
    });
    expect(networkFailure.status).toBe(503);
    expect(networkFailure.headers.get("content-type")).toContain("application/json");
    expect(await networkFailure.json()).toMatchObject({ code: "WALLET_PROVIDER_UNAVAILABLE" });
  });

  it("preserves Pro entitlement enforcement", async () => {
    const response = await handleWalletRequest("known-card", request, {
      walletApiKey: testWalletKey,
      resolveCard: async () => ({
        status: "found",
        card: { ...card, public_features_enabled: false },
      }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "WALLET_NOT_ENTITLED" });
  });

  it("has no local certificate path, staging disable, or browser-side Wallet secret", () => {
    const routeSource = readFileSync(
      new URL("../routes/api/wallet.$slug.ts", import.meta.url),
      "utf8",
    );
    const dashboardSource = readFileSync(
      new URL("../components/dashboard/QrTab.tsx", import.meta.url),
      "utf8",
    );

    expect(routeSource).not.toMatch(/PASS_TYPE_ID|PRIVATE_KEY|certificate/i);
    expect(routeSource).not.toMatch(/environment\s*===?\s*["']staging["']/i);
    expect(dashboardSource).not.toContain("Signing Unavailable in Staging");
    expect(dashboardSource).not.toMatch(/WALLET_API_KEY|VITE_.*WALLET/i);
  });
});
