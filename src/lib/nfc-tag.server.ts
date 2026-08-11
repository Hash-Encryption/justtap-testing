import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAnonKey, getSupabaseUrl } from "./supabase";
import { resolveSlugByTagToken, type TagLookupResult } from "./nfc-tag";

export async function resolveTagTokenFromSupabase(token: string): Promise<TagLookupResult> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return resolveSlugByTagToken(
    token,
    async (validatedToken) => {
      try {
        const response = await fetch(`${url}/rest/v1/rpc/get_public_card_by_tag_token`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ _token: validatedToken }),
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
        console.error("[nfc-tag] Supabase lookup failed", { token, ...diagnostic });
      },
    },
  );
}

export const getPublicCardByTagToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => resolveTagTokenFromSupabase(data.token));
