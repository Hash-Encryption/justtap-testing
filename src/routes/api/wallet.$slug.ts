import { createFileRoute } from "@tanstack/react-router";
import { resolvePublicCardFromSupabase } from "@/lib/public-card.server";
import { buildVCard } from "@/lib/card";
import { validateSlug } from "@/lib/slug";

export const Route = createFileRoute("/api/wallet/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugResult = validateSlug(params.slug || "");
        if (!slugResult.valid) {
          return new Response(JSON.stringify({ error: "Invalid card parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const cleanSlug = slugResult.slug;

        const result = await resolvePublicCardFromSupabase(cleanSlug);
        if (result.status !== "found" || !result.card) {
          return new Response(JSON.stringify({ error: "Card not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const card = result.card;
        const vcardText = buildVCard(card);
        const walletApiKey =
          typeof process !== "undefined" ? process.env?.["WALLET_API_KEY"] : null;

        // Secure server-side Apple Wallet signing via WalletWallet API
        if (walletApiKey && !walletApiKey.includes("demo")) {
          try {
            const walletResponse = await fetch("https://api.walletwallet.dev/v1/passes/apple", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${walletApiKey}`,
              },
              body: JSON.stringify({
                card_title: card.full_name,
                subtitle: card.title || card.company || "Digital Business Card",
                barcode: {
                  format: "PKBarcodeFormatQR",
                  message: vcardText,
                  messageEncoding: "iso-8859-1",
                },
                primaryFields: [{ key: "name", label: "NAME", value: card.full_name }],
                secondaryFields: [
                  { key: "title", label: "TITLE", value: card.title || "" },
                  { key: "company", label: "COMPANY", value: card.company || "" },
                ],
                auxiliaryFields: [{ key: "phone", label: "PHONE", value: card.phone || "" }],
              }),
            });

            if (walletResponse.ok) {
              const passBuffer = await walletResponse.arrayBuffer();
              return new Response(passBuffer, {
                status: 200,
                headers: {
                  "Content-Type": "application/vnd.apple.pkpass",
                  "Content-Disposition": `attachment; filename="${cleanSlug}.pkpass"`,
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                },
              });
            }
          } catch (walletErr) {
            console.warn("[wallet-api] WalletWallet signing request failed:", walletErr);
          }
        }

        // Production signing infrastructure is not configured in this environment.
        // As required by Phase 06 prompt rules: NEVER generate fake .pkpass files.
        return new Response(
          JSON.stringify({
            error: "Apple Wallet Pass signing service is not configured in this environment.",
            code: "SIGNING_NOT_CONFIGURED",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      },
    },
  },
});
