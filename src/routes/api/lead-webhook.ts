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
          const { getSupabaseServiceRoleKey } = await import("@/lib/server-env");
          const apiKey = getSupabaseServiceRoleKey() || SUPABASE_ANON_KEY;

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

          // Check caller authentication
          const authHeader = request.headers.get("Authorization");
          const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
          let isOwner = false;
          if (token) {
            const { data: userData } = await client.auth.getUser(token);
            if (userData?.user && userData.user.id === card.user_id) {
              isOwner = true;
            }
          }

          if (is_test) {
            if (!isOwner) {
              return new Response(
                JSON.stringify({
                  error: "Unauthorized: Owner authentication required for test mode",
                }),
                { status: 401, headers: { "Content-Type": "application/json" } },
              );
            }
          } else {
            const connectionId = body.connection_id;
            if (!connectionId) {
              return new Response(JSON.stringify({ error: "Connection verification required" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }
            const { data: leadRecord } = await client
              .from("card_leads")
              .select("id")
              .eq("id", connectionId)
              .eq("card_id", card_id)
              .maybeSingle();

            if (!leadRecord) {
              return new Response(JSON.stringify({ error: "Invalid connection verification" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

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
