import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";
import { resolvePublicCardBySlug, type PublicCardLookupResult } from "./public-card";

function createPublicSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function resolvePublicCardFromSupabase(slug: string): Promise<PublicCardLookupResult> {
  const client = createPublicSupabaseClient();

  return resolvePublicCardBySlug(
    slug,
    async (normalizedSlug) => {
      const { data, error } = await client
        .rpc("get_public_card_by_slug", { _slug: normalizedSlug })
        .maybeSingle();

      return { data, error };
    },
    {
      onServiceError(error) {
        const diagnostic =
          error && typeof error === "object"
            ? {
                code: "code" in error ? String(error.code) : undefined,
                message: "message" in error ? String(error.message) : "Unknown query failure",
              }
            : { message: String(error) };
        console.error("[public-card] Supabase lookup failed", { slug, ...diagnostic });
      },
    },
  );
}

export const getPublicCardBySlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => resolvePublicCardFromSupabase(data.slug));
