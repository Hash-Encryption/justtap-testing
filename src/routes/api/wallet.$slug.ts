import { createFileRoute } from "@tanstack/react-router";
import { resolvePublicCardFromSupabase } from "@/lib/public-card.server";
import type { PublicCardLookupResult } from "@/lib/public-card";
import { resolveTagTokenFromSupabase } from "@/lib/nfc-tag.server";
import type { TagLookupResult } from "@/lib/nfc-tag";
import { getWalletApiKey } from "@/lib/server-env";
import { validateSlug } from "@/lib/slug";

export const WALLETWALLET_PASSES_ENDPOINT = "https://api.walletwallet.dev/api/passes";

type WalletDependencies = {
  fetch?: typeof fetch;
  walletApiKey?: string | null;
  resolveCard?: (slug: string) => Promise<PublicCardLookupResult>;
  resolveTagToken?: (token: string) => Promise<TagLookupResult>;
};

function errorResponse(status: number, error: string, code: string) {
  return Response.json(
    { error, code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function decodeSignedPass(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const binary = atob(value);
    const pass = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return pass[0] === 0x50 && pass[1] === 0x4b ? pass : null;
  } catch {
    return null;
  }
}

export async function handleWalletRequest(
  slug: string,
  request: Request,
  dependencies: WalletDependencies = {},
) {
  const slugResult = validateSlug(slug);
  if (!slugResult.valid) {
    return errorResponse(400, "Invalid card parameter", "INVALID_CARD_PARAMETER");
  }
  const cleanSlug = slugResult.slug;
  const resolveCard = dependencies.resolveCard ?? resolvePublicCardFromSupabase;
  const result = await resolveCard(cleanSlug);

  if (result.status === "service_error") {
    return errorResponse(503, "Card service is temporarily unavailable.", "CARD_SERVICE_ERROR");
  }
  if (result.status !== "found") {
    return errorResponse(404, "Card not found", "CARD_NOT_FOUND");
  }
  if (!result.card.public_features_enabled) {
    return errorResponse(403, "Apple Wallet passes require a Pro plan.", "WALLET_NOT_ENTITLED");
  }

  const walletApiKey =
    dependencies.walletApiKey === undefined ? getWalletApiKey() : dependencies.walletApiKey;
  if (!walletApiKey) {
    return errorResponse(
      503,
      "Apple Wallet provider is not configured on the server.",
      "WALLET_PROVIDER_CONFIG_ERROR",
    );
  }

  const requestUrl = new URL(request.url);
  let barcodeValue = `${requestUrl.origin}/c/${cleanSlug}`;
  const tagToken = requestUrl.searchParams.get("token");
  if (tagToken) {
    const resolveTagToken = dependencies.resolveTagToken ?? resolveTagTokenFromSupabase;
    const tag = await resolveTagToken(tagToken);
    if (tag.status === "found" && tag.slug === cleanSlug) {
      barcodeValue = `${requestUrl.origin}/t/${tagToken}`;
    }
  }

  const secondaryFields = [
    result.card.title ? { label: "TITLE", value: result.card.title } : null,
    result.card.company ? { label: "COMPANY", value: result.card.company } : null,
  ].filter((field): field is { label: string; value: string } => field !== null);
  const backFields = [
    result.card.phone ? { label: "PHONE", value: result.card.phone } : null,
    result.card.email ? { label: "EMAIL", value: result.card.email } : null,
    result.card.social_links?.website
      ? { label: "WEBSITE", value: result.card.social_links.website }
      : null,
  ].filter((field): field is { label: string; value: string } => field !== null);

  let walletResponse: Response;
  try {
    walletResponse = await (dependencies.fetch ?? fetch)(WALLETWALLET_PASSES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${walletApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barcodeValue,
        barcodeFormat: "QR",
        logoText: "JustTap",
        description: `Digital business card for ${result.card.full_name}`,
        organizationName: "JustTap",
        primaryFields: [{ label: "NAME", value: result.card.full_name }],
        secondaryFields,
        backFields,
        colorPreset: "purple",
        sharingProhibited: false,
      }),
    });
  } catch {
    return errorResponse(
      503,
      "Apple Wallet provider is temporarily unavailable.",
      "WALLET_PROVIDER_UNAVAILABLE",
    );
  }

  if (!walletResponse.ok) {
    if (walletResponse.status === 400) {
      return errorResponse(400, "The Wallet pass data is invalid.", "WALLET_PAYLOAD_INVALID");
    }
    if (walletResponse.status === 401) {
      return errorResponse(
        503,
        "Apple Wallet provider authentication is not configured correctly on the server.",
        "WALLET_PROVIDER_AUTH_ERROR",
      );
    }
    if (walletResponse.status === 429) {
      return errorResponse(
        429,
        "Apple Wallet provider rate limit reached. Please try again shortly.",
        "WALLET_PROVIDER_RATE_LIMIT",
      );
    }
    return errorResponse(
      503,
      "Apple Wallet provider is temporarily unavailable.",
      "WALLET_PROVIDER_UNAVAILABLE",
    );
  }

  const providerData = await walletResponse.json().catch(() => null);
  const signedPass = decodeSignedPass(
    providerData && typeof providerData === "object" && "applePass" in providerData
      ? providerData.applePass
      : null,
  );
  if (!signedPass) {
    return errorResponse(
      503,
      "Apple Wallet provider returned an invalid pass.",
      "WALLET_PROVIDER_INVALID_RESPONSE",
    );
  }

  return new Response(signedPass, {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="justtap.pkpass"',
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/wallet/$slug")({
  server: {
    handlers: {
      GET: ({ params, request }) => handleWalletRequest(params.slug || "", request),
    },
  },
});
