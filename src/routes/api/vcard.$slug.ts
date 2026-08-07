import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { buildVCard, type Card } from "@/lib/card";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitization";

export const Route = createFileRoute("/api/vcard/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // 1. Sanitize and validate parameters
        const rawSlug = params.slug || "";
        const cleanSlug = sanitizeText(rawSlug, 48).toLowerCase();

        if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
          return new Response("Invalid request parameter", {
            status: 400,
            headers: {
              "Content-Type": "text/plain",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        // 2. Rate limiting check (max 10 downloads per minute per client)
        const clientIp =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("cf-connecting-ip") ||
          "anonymous";

        const rateLimitKey = `vcard:${cleanSlug}:${clientIp}`;
        const { allowed, resetMs } = checkRateLimit(rateLimitKey, 10, 60_000);

        if (!allowed) {
          return new Response("Rate limit exceeded. Please try again shortly.", {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(resetMs / 1000).toString(),
              "Content-Type": "text/plain",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        // 3. Query Supabase securely
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
            headers: {
              "Content-Type": "text/plain",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        const card = data as Card;

        // 4. Log analytics safely
        await client.from("card_analytics").insert({
          card_id: card.id,
          event_type: "vcard_download",
          user_agent: sanitizeText(request.headers.get("user-agent") || "", 250) || null,
        });

        // 5. Stream vCard response with strict security headers
        return new Response(buildVCard(card), {
          headers: {
            "Content-Type": "text/vcard; charset=utf-8",
            "Content-Disposition": `attachment; filename="${cleanSlug}.vcf"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        });
      },
    },
  },
});
