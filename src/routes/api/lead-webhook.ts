import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { sanitizeText, sanitizePhone } from "@/lib/sanitization";
import type { Card } from "@/lib/card";

export const Route = createFileRoute("/api/lead-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { card_id, sender_name, sender_phone, note, is_test } = body;

          if (!card_id) {
            return new Response(JSON.stringify({ error: "Missing card_id" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Query card and pro features
          const apiKey =
            (typeof process !== "undefined" && process.env?.["SUPABASE_SERVICE_ROLE_KEY"]) ||
            SUPABASE_ANON_KEY;

          const client = createClient(SUPABASE_URL, apiKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data } = await client.from("cards").select("*").eq("id", card_id).maybeSingle();

          if (!data) {
            return new Response(JSON.stringify({ error: "Card not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const card = data as Card;
          const pro = card.pro_features;

          if (!pro?.enable_lead_webhook && !is_test) {
            return new Response(
              JSON.stringify({ message: "Lead webhooks not enabled for this card" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          const cleanName = sanitizeText(sender_name || "New Visitor Lead", 100);
          const cleanPhone = sanitizePhone(sender_phone || "");
          const cleanNote = sanitizeText(note || "", 500);

          const payload = {
            event: is_test ? "lead.test" : "lead.captured",
            timestamp: new Date().toISOString(),
            card: {
              id: card.id,
              slug: card.slug,
              full_name: card.full_name,
              owner_email: card.email,
            },
            lead: {
              sender_name: cleanName,
              sender_phone: cleanPhone,
              note: cleanNote || null,
            },
          };

          let webhookStatus = "none";

          // Dispatch HTTP POST to Zapier / Make / Custom Webhook URL
          if (pro?.webhook_url && pro.webhook_url.startsWith("http")) {
            try {
              const res = await fetch(pro.webhook_url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "JustTap-Webhook-Dispatcher/1.0",
                },
                body: JSON.stringify(payload),
              });
              webhookStatus = res.ok ? "delivered" : `failed_${res.status}`;
            } catch (err) {
              webhookStatus = "network_error";
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              webhook_status: webhookStatus,
              notified_email: pro?.notify_email || card.email || null,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Content-Type-Options": "nosniff",
              },
            },
          );
        } catch (err) {
          return new Response(JSON.stringify({ error: "Invalid webhook request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
