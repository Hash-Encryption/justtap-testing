import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseAnonKey, getSupabaseUrl } from "./supabase";
import { resolvePublicCardBySlug, type PublicCardLookupResult } from "./public-card";
import { resolvePublicOrigin } from "./public-card-metadata";

export async function resolvePublicCardFromSupabase(slug: string): Promise<PublicCardLookupResult> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return resolvePublicCardBySlug(
    slug,
    async (normalizedSlug) => {
      try {
        const response = await fetch(`${url}/rest/v1/rpc/get_public_card_by_slug`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ _slug: normalizedSlug }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return { data: null, error: { message: `HTTP ${response.status}: ${errText}` } };
        }

        const data = await response.json();
        return { data, error: null };
      } catch (err) {
        return { data: null, error: { message: String(err) } };
      }
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

export const getPublicCardPageData = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => ({
    result: await resolvePublicCardFromSupabase(data.slug),
    publicOrigin: resolvePublicOrigin(
      import.meta.env.VITE_PUBLIC_SITE_URL ||
        process.env.PUBLIC_SITE_URL ||
        process.env.CF_PAGES_URL,
      getRequest().url,
    ),
  }));
