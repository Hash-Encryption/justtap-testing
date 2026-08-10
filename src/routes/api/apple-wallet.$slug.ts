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
          .ilike("slug", cleanSlug)
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
        const pro = (typeof card.pro_features === "object" && card.pro_features !== null)
          ? card.pro_features
          : {};

        // Log analytics event
        await client.from("card_analytics").insert({
          card_id: card.id,
          event_type: "apple_wallet_download",
          user_agent: sanitizeText(request.headers.get("user-agent") || "", 250) || null,
        });

        // 1. FAST CACHE CHECK: If pass URL already generated & cached in Supabase, return it!
        if (
          pro.wallet_pass_url &&
          pro.wallet_pass_url.startsWith("http") &&
          !pro.wallet_pass_url.includes("your-pass-id") &&
          !pro.wallet_pass_url.includes("example.com")
        ) {
          return Response.redirect(pro.wallet_pass_url, 302);
        }

        // 2. Check for platform WalletWallet.dev API key in environment
        const walletApiKey =
          typeof process !== "undefined"
            ? process.env?.["WALLETWALLET_API_KEY"] || process.env?.["WALLET_API_KEY"]
            : null;

        const customEndpoint =
          (typeof process !== "undefined" && process.env?.["WALLETWALLET_API_ENDPOINT"]) ||
          "https://api.walletwallet.dev/v1/passes/apple";

        if (walletApiKey) {
          try {
            const wwRes = await fetch(customEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${walletApiKey}`,
                "X-API-Key": walletApiKey,
              },
              body: JSON.stringify({
                card_id: card.id,
                slug: card.slug,
                full_name: card.full_name,
                title: card.title || "",
                company: card.company || "",
                phone: card.phone || "",
                email: card.email || "",
                accent_color: card.accent_color || "#2563eb",
                qr_url: cardUrl,
              }),
            });

            if (wwRes.ok) {
              const contentType = wwRes.headers.get("content-type") || "";
              if (contentType.includes("json")) {
                const json = (await wwRes.json()) as {
                  url?: string;
                  download_url?: string;
                  pass_url?: string;
                };
                const passUrl = json.url || json.download_url || json.pass_url;
                if (passUrl) {
                  // Cache generated pass URL in Supabase card record for instant future visits
                  await client
                    .from("cards")
                    .update({
                      pro_features: { ...pro, wallet_pass_url: passUrl },
                    })
                    .eq("id", card.id);

                  return Response.redirect(passUrl, 302);
                }
              } else {
                const arrayBuffer = await wwRes.arrayBuffer();
                return new Response(arrayBuffer, {
                  headers: {
                    "Content-Type": "application/vnd.apple.pkpass",
                    "Content-Disposition": `attachment; filename="${cleanSlug}.pkpass"`,
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                  },
                });
              }
            }
          } catch (wwErr) {
            console.error("WalletWallet API error:", wwErr);
          }
        }

        // 2. Local Apple Wallet pass builder fallback
        const pkpassBuffer = await buildAppleWalletPass(card, originUrl);

        return new Response(pkpassBuffer, {
          headers: {
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": `attachment; filename="${cleanSlug}.pkpass"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        });
      },
    },
  },
});
