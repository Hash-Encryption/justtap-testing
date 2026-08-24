import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { sanitizeText, sanitizePhone } from "@/lib/sanitization";
import type { Card } from "@/lib/card";

export const Route = createFileRoute("/api/lead-email")({
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

          const { getResendApiKey, getSupabaseServiceRoleKey } = await import("@/lib/server-env");
          const resendKey = getResendApiKey();

          if (!resendKey) {
            return new Response(JSON.stringify({ error: "Email delivery is unavailable" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }

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
          const recipientEmail = pro?.notify_email || card.email;
          const isEmailEnabled = pro?.enable_email_alerts !== false;

          if (!isEmailEnabled && !is_test) {
            return new Response(
              JSON.stringify({ message: "Email notifications disabled for this card" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          if (!recipientEmail) {
            return new Response(
              JSON.stringify({ error: "No recipient email address configured" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const cleanName = sanitizeText(sender_name || "New Visitor", 100);
          const cleanPhone = sanitizePhone(sender_phone || "");
          const cleanNote = sanitizeText(note || "", 500);

          const emailSubject = is_test
            ? `[TEST] JustTap Lead Alert for ${card.full_name}`
            : `New Lead Captured: ${cleanName} on your JustTap Card`;

          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #334155;">
              <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
                <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #ffffff;">JustTap<span style="color: #8b5cf6;">.</span></h1>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Instant Lead Notification</p>
              </div>

              <div style="padding: 24px 0;">
                <h2 style="font-size: 18px; font-weight: 700; color: #8b5cf6; margin: 0 0 16px 0;">
                  ${is_test ? "Test Lead Alert" : "Someone just scanned your card and exchanged info!"}
                </h2>

                <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Contact Name</span>
                    <p style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 2px 0 0 0;">${cleanName}</p>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Phone Number</span>
                    <p style="font-size: 16px; font-weight: 700; color: #38bdf8; margin: 2px 0 0 0;">
                      <a href="tel:${cleanPhone}" style="color: #38bdf8; text-decoration: none;">${cleanPhone}</a>
                    </p>
                  </div>
                  ${
                    cleanNote
                      ? `<div>
                    <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Short Note</span>
                    <p style="font-size: 14px; color: #cbd5e1; margin: 2px 0 0 0; font-style: italic;">"${cleanNote}"</p>
                  </div>`
                      : ""
                  }
                </div>
              </div>

              <div style="text-align: center; padding-top: 16px; border-top: 1px solid #1e293b;">
                <p style="font-size: 12px; color: #64748b; margin: 0;">
                  Card: <strong>${card.full_name}</strong> (/c/${card.slug})
                </p>
              </div>
            </div>
          `;

          let emailStatus = "resend_not_attempted";

          try {
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "JustTap <noreply@justtap.me>",
                to: [recipientEmail],
                subject: emailSubject,
                html: emailHtml,
              }),
            });
            const resData = await resendRes.json();
            emailStatus = resendRes.ok
              ? "sent_via_resend"
              : `resend_error_${resendRes.status}_${resData?.message || ""}`;
          } catch {
            emailStatus = "resend_fetch_error";
          }

          if (pro?.enable_lead_webhook && pro.webhook_url) {
            void fetch(pro.webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: is_test ? "lead.test" : "lead.captured",
                card: { id: card.id, slug: card.slug, name: card.full_name },
                lead: { name: cleanName, phone: cleanPhone, note: cleanNote },
              }),
            }).catch(() => {});
          }

          return new Response(
            JSON.stringify({
              success: true,
              email_status: emailStatus,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch {
          return new Response(
            JSON.stringify({ error: "Failed to process lead notification email" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
