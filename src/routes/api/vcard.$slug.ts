import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { buildVCard, type Card } from "@/lib/card";

export const Route = createFileRoute("/api/vcard/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const apiKey =
          (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
          SUPABASE_ANON_KEY;

        const client = createClient(SUPABASE_URL, apiKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await client
          .from("cards")
          .select("*")
          .eq("slug", params.slug)
          .maybeSingle();

        if (error || !data) {
          return new Response("Card not found", { status: 404 });
        }

        const card = data as Card;

        await client.from("card_analytics").insert({
          card_id: card.id,
          event_type: "vcard_download",
          user_agent: request.headers.get("user-agent"),
        });

        return new Response(buildVCard(card), {
          headers: {
            "Content-Type": "text/vcard; charset=utf-8",
            "Content-Disposition": `attachment; filename="${params.slug}.vcf"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
