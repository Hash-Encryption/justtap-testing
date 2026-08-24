import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { buildVCard } from "@/lib/card";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateSlug } from "@/lib/slug";
import { resolvePublicCardFromSupabase } from "@/lib/public-card.server";

export const Route = createFileRoute("/api/vcard/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // 1. Sanitize and validate parameters
        const slugResult = validateSlug(params.slug || "");

        if (!slugResult.valid) {
          return new Response("Invalid request parameter", {
            status: 400,
            headers: {
              "Content-Type": "text/plain",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        const cleanSlug = slugResult.slug;

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

        // 3. Resolve the same active public projection used by /c/:slug
        const result = await resolvePublicCardFromSupabase(cleanSlug);
        if (result.status === "service_error") {
          return new Response("Card service unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain", "X-Content-Type-Options": "nosniff" },
          });
        }
        if (result.status !== "found") {
          return new Response("Card not found", {
            status: 404,
            headers: { "Content-Type": "text/plain", "X-Content-Type-Options": "nosniff" },
          });
        }

        const card = result.card;

        // 4. Log analytics without changing public-card resolution semantics
        const requestUrl = new URL(request.url);
        const eventId = requestUrl.searchParams.get("event_id") || crypto.randomUUID();
        const sessionId = requestUrl.searchParams.get("session_id");
        const referrerHost = requestUrl.searchParams.get("referrer_host");
        const deviceCategory = requestUrl.searchParams.get("device_category");
        const metadata = {
          ...(referrerHost ? { referrer_host: referrerHost } : {}),
          ...(deviceCategory ? { device_category: deviceCategory } : {}),
        };

        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        await client.rpc("record_public_card_event", {
          _card_slug: card.slug,
          _event_type: "vcard_download",
          _event_id: eventId,
          _session_id: sessionId,
          _metadata: metadata,
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
