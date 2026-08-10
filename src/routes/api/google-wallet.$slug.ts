import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { type Card } from "@/lib/card";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitization";

export const Route = createFileRoute("/api/google-wallet/$slug")({
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

        const { allowed, resetMs } = checkRateLimit(`google-wallet:${cleanSlug}:${clientIp}`, 10, 60_000);
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
        const cardUrl = `${originUrl}/c/${card.slug}`;

        // Log analytics event
        await client.from("card_analytics").insert({
          card_id: card.id,
          event_type: "google_wallet_download",
          user_agent: sanitizeText(request.headers.get("user-agent") || "", 250) || null,
        });

        // Google Wallet Web Pass Saver HTML Page with Save to Google Wallet button
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Save ${card.full_name} to Google Wallet</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; }
    h1 { font-size: 22px; margin: 16px 0 4px; }
    p { font-size: 13px; color: #94a3b8; margin: 0 0 24px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #4285F4; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 14px 24px; border-radius: 16px; width: 100%; box-sizing: border-box; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .vcf-btn { display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 1px solid #334155; color: #cbd5e1; font-weight: 500; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 16px; width: 100%; box-sizing: border-box; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Google Wallet Digital Pass</span>
    <h1>${card.full_name}</h1>
    <p>${card.title || card.company || "Digital Business Card"}</p>
    <a href="/api/vcard/${card.slug}" class="btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save to Google Wallet / Contacts
    </a>
    <a href="${cardUrl}" class="vcf-btn">View Live Profile</a>
  </div>
</body>
</html>`;

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        });
      },
    },
  },
});
