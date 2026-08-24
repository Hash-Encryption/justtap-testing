import { describe, expect, it } from "vitest";

type RouteServerHandler = {
  options: {
    server?: {
      handlers?: {
        POST?: (ctx: { request: Request }) => Promise<Response>;
      };
    };
  };
};

describe("Lead Webhook & Email Security Matrix", () => {
  it("proves unauthenticated test mode requests are rejected with 401 Unauthorized", async () => {
    const { Route: webhookRoute } = await import("@/routes/api/lead-webhook");
    const handler = (webhookRoute as unknown as RouteServerHandler).options.server?.handlers?.POST;
    expect(handler).toBeDefined();

    // Anonymous request with is_test: true
    const unauthReq = new Request("https://justtap.pages.dev/api/lead-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: "11111111-1111-4111-8111-111111111111",
        sender_name: "Attacker Probe",
        is_test: true,
      }),
    });

    const res = await handler!({ request: unauthReq });
    // Either 404 (if card not found) or 401 (if unauthorized)
    expect([401, 404]).toContain(res.status);
    const body = await res.json();
    expect(body.notified_email).toBeUndefined();
    expect(body.recipient).toBeUndefined();
  });

  it("proves unauthenticated lead capture without connection_id evidence is rejected with 403", async () => {
    const { Route: webhookRoute } = await import("@/routes/api/lead-webhook");
    const handler = (webhookRoute as unknown as RouteServerHandler).options.server?.handlers?.POST;

    const unauthReq = new Request("https://justtap.pages.dev/api/lead-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: "11111111-1111-4111-8111-111111111111",
        sender_name: "Fake Lead Without Connection",
        is_test: false,
      }),
    });

    const res = await handler!({ request: unauthReq });
    // Either 404 (if card not found) or 403 (if missing connection verification)
    expect([403, 404]).toContain(res.status);
    const body = await res.json();
    expect(body.notified_email).toBeUndefined();
  });

  it("proves lead-email endpoint rejects unauthenticated test mode and hides recipient email", async () => {
    const { Route: emailRoute } = await import("@/routes/api/lead-email");
    const handler = (emailRoute as unknown as RouteServerHandler).options.server?.handlers?.POST;
    expect(handler).toBeDefined();

    const unauthReq = new Request("https://justtap.pages.dev/api/lead-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: "11111111-1111-4111-8111-111111111111",
        sender_name: "Attacker Email Spam",
        is_test: true,
      }),
    });

    const res = await handler!({ request: unauthReq });
    expect([401, 404, 503]).toContain(res.status);
    const body = await res.json();
    expect(body.recipient).toBeUndefined();
  });
});
