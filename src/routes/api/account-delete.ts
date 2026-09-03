import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/account-delete
 *
 * Trusted server route for customer self-service account deletion.
 * Securely deletes user's Auth identity and cleans up customer rows,
 * while safely detaching physical NFC tags and preserving historical
 * commerce / order records for accounting compliance.
 *
 * Never exposes service-role credentials to the client.
 */
export const Route = createFileRoute("/api/account-delete")({
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

          // Rate-limit: 5 deletion attempts per hour per IP
          const rateCheck = checkRateLimit(`account_delete:${clientIp}`, 5, 60 * 60_000);
          if (!rateCheck.allowed) {
            return json({ ok: false, error: "Too many requests. Please try again later." }, 429);
          }

          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return json({ ok: false, error: "Authentication required" }, 401);
          }
          const jwt = authHeader.slice(7);

          const body = (await request.json().catch(() => ({}))) as { confirmation?: string };
          if (!body.confirmation || body.confirmation.trim().toUpperCase() !== "DELETE") {
            return json(
              { ok: false, error: "Invalid confirmation string. Please type DELETE to confirm." },
              400,
            );
          }

          const { createClient } = await import("@supabase/supabase-js");
          const { getSupabaseServiceRoleKey } = await import("@/lib/server-env");
          const { getPublicEnvVariable } = await import("@/lib/env");

          const serviceKey = getSupabaseServiceRoleKey();
          const supabaseUrl = getPublicEnvVariable("SUPABASE_URL");

          if (!serviceKey || !supabaseUrl) {
            return json({ ok: false, error: "Service unavailable" }, 503);
          }

          const serviceClient = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false },
          });

          // Verify user from JWT
          const {
            data: { user },
            error: userError,
          } = await serviceClient.auth.getUser(jwt);

          if (userError || !user) {
            return json({ ok: false, error: "Invalid or expired session" }, 401);
          }

          const userId = user.id;

          // 1. Find all cards owned by user
          const { data: userCards } = await serviceClient
            .from("cards")
            .select("id")
            .eq("user_id", userId);

          const cardIds = (userCards || []).map((c) => c.id);

          // 2. Safely detach and deactivate linked NFC tags without deleting them
          if (cardIds.length > 0) {
            await serviceClient
              .from("nfc_tags")
              .update({ card_id: null, status: "inactive" })
              .in("card_id", cardIds);
          }

          // 3. Delete user's public entities and revoke saved payment methods
          // Historic card_orders, payments, refunds, and subscriptions survive with user_id set to NULL
          if (cardIds.length > 0) {
            await serviceClient.from("card_leads").delete().in("card_id", cardIds);
            await serviceClient.from("card_analytics").delete().in("card_id", cardIds);
            await serviceClient.from("cards").delete().eq("user_id", userId);
          }

          await serviceClient.from("payment_methods").delete().eq("user_id", userId);
          await serviceClient.from("user_roles").delete().eq("user_id", userId);
          await serviceClient.from("profiles").delete().eq("user_id", userId);

          // 4. Delete the Auth User from Supabase Auth
          const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId);
          if (deleteAuthError) {
            console.error("[account-delete] Error deleting auth user:", deleteAuthError);
            return json({ ok: false, error: "Failed to delete auth identity" }, 500);
          }

          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[account-delete]", err);
          return json(
            { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
            500,
          );
        }
      },
    },
  },
});
