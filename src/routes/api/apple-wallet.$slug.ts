import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { buildAppleWalletPass } from "@/lib/apple-pass-builder";
import { type Card } from "@/lib/card";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitization";

export const Route = createFileRoute("/api/apple-wallet/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const rawSlug = params.slug || "";
        const cleanSlug = sanitizeText(rawSlug, 48).toLowerCase();

        if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
          return new Response("Invalid request parameter", {
            status: 400,
            headers: { "Content-Type": "text/plain" },
          });
        }

        const clientIp =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("cf-connecting-ip") ||
          "anonymous";

        const { allowed, resetMs } = checkRateLimit(`apple-wallet:${cleanSlug}:${clientIp}`, 10, 60_000);
        if (!allowed) {
          return new Response("Rate limit exceeded. Please try again shortly.", {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(resetMs / 1000).toString(),
              "Content-Type": "text/plain",
            },
          });
        }

        const apiKey =
          (typeof process !== "undefined" && process.env?.["SUPABASE_SERVICE_ROLE_KEY"]) ||
          SUPABASE_ANON_KEY;

        const client = createClient(SUPABASE_URL, apiKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await client
          .from("cards")
          .select("*")
          .eq("slug", cleanSlug)
          .maybeSingle();

        if (error || !data) {
          return new Response("Card not found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
        }

        const card = data as Card;
        const originUrl = new URL(request.url).origin;
        const pkpassBuffer = await buildAppleWalletPass(card, originUrl);

        // Log analytics event
        await client.from("card_analytics").insert({
          card_id: card.id,
          event_type: "apple_wallet_download",
          user_agent: sanitizeText(request.headers.get("user-agent") || "", 250) || null,
        });

        return new Response(pkpassBuffer, {
          headers: {
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": `inline; filename="${cleanSlug}.pkpass"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        });
      },
    },
  },
});
