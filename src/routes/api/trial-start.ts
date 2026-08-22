import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/trial-start
 *
 * Trusted server route that starts a 7-day Pro trial for the authenticated user.
 * Calls the start_pro_trial() SECURITY DEFINER RPC via the service-role client.
 * The RPC enforces: authentication, one-trial-per-account, existing-plan guard.
 *
 * BILLING EXTENSION POINT: when Stripe payment methods are collected, verify the
 * payment method with Stripe here before calling the RPC. On Stripe failure, return
 * 402 without starting the trial. On Stripe success, proceed to rpc('start_pro_trial').
 *
 * Returns:
 *   200 { ok: true, trialEndsAt: string (ISO-8601 UTC) }
 *   401 if no valid session
 *   409 if trial already used or account already upgraded
 *   429 if rate-limited
 *   500 on unexpected error
 */
export const Route = createFileRoute("/api/trial-start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (body: unknown, status: number) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          });

        try {
          const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("cf-connecting-ip") ||
            "anonymous";

          // Rate-limit: 3 attempts per hour per IP
          const rateCheck = checkRateLimit(`trial_start:${clientIp}`, 3, 60 * 60_000);
          if (!rateCheck.allowed) {
            return json(
              { ok: false, error: "Too many trial requests. Please try again later." },
              429,
            );
          }

          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return json({ ok: false, error: "Authentication required" }, 401);
          }
          const jwt = authHeader.slice(7);

          const { createClient } = await import("@supabase/supabase-js");
          const { getSupabaseServiceRoleKey } = await import("@/lib/server-env");
          const { getPublicEnvVariable } = await import("@/lib/env");

          const serviceKey = getSupabaseServiceRoleKey();
          if (!serviceKey) {
            return json({ ok: false, error: "Service unavailable" }, 503);
          }

          const supabaseUrl = getPublicEnvVariable("SUPABASE_URL");
          if (!supabaseUrl) {
            return json({ ok: false, error: "Service unavailable" }, 503);
          }

          // Service-role client used only to call the SECURITY DEFINER RPC.
          // The RPC itself enforces all business-logic guards using auth.uid()
          // derived from the user JWT passed in the Authorization header.
          const serviceClient = createClient(supabaseUrl, serviceKey, {
            global: { headers: { Authorization: `Bearer ${jwt}` } },
          });

          const { data, error } = await serviceClient.rpc("start_pro_trial");

          if (error) {
            // 42501 = postgres insufficient_privilege — maps to our business-logic rejections
            const isConflict =
              error.code === "42501" ||
              error.message?.includes("already used") ||
              error.message?.includes("already on an active plan");
            return json(
              { ok: false, error: error.message ?? "Trial could not be started" },
              isConflict ? 409 : 500,
            );
          }

          const result = data as { ok: boolean; trial_ends_at: string };
          return json({ ok: true, trialEndsAt: result.trial_ends_at }, 200);
        } catch (err) {
          console.error("[trial-start]", err);
          return json({ ok: false, error: "Unexpected error" }, 500);
        }
      },
    },
  },
});
