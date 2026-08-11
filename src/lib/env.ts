import { z } from "zod";

const publicEnvSchema = z.object({
  SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(20, "VITE_SUPABASE_ANON_KEY must be configured"),
});

function getPublicEnvVariable(key: "SUPABASE_URL" | "SUPABASE_ANON_KEY") {
  const publicKey = `VITE_${key}`;

  if (typeof import.meta !== "undefined" && import.meta.env?.[publicKey]) {
    return import.meta.env[publicKey] as string;
  }

  if (typeof process !== "undefined" && process.env?.[publicKey]) {
    return process.env[publicKey];
  }

  return undefined;
}

const parsed = publicEnvSchema.safeParse({
  SUPABASE_URL: getPublicEnvVariable("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getPublicEnvVariable("SUPABASE_ANON_KEY"),
});

if (!parsed.success && typeof window === "undefined") {
  console.warn(
    "[Environment Warning] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured; Supabase access is disabled.",
  );
}

export const env = parsed.success
  ? parsed.data
  : { SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined };

export const isPublicSupabaseConfigured = parsed.success;
