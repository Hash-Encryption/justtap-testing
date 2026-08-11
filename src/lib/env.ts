import { z } from "zod";

const publicEnvSchema = z.object({
  SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(20, "VITE_SUPABASE_ANON_KEY must be configured"),
});

export function getPublicEnvVariable(
  key: "SUPABASE_URL" | "SUPABASE_ANON_KEY",
): string | undefined {
  if (key === "SUPABASE_URL") {
    return (
      (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
      undefined
    );
  }
  if (key === "SUPABASE_ANON_KEY") {
    return (
      (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
      undefined
    );
  }
  return undefined;
}

export function getPublicSupabaseConfig() {
  const parsed = publicEnvSchema.safeParse({
    SUPABASE_URL: getPublicEnvVariable("SUPABASE_URL"),
    SUPABASE_ANON_KEY: getPublicEnvVariable("SUPABASE_ANON_KEY"),
  });
  if (parsed.success) {
    return {
      configured: true,
      url: parsed.data.SUPABASE_URL,
      anonKey: parsed.data.SUPABASE_ANON_KEY,
    };
  }
  return {
    configured: false,
    url: undefined,
    anonKey: undefined,
  };
}

export const env = {
  get SUPABASE_URL() {
    return getPublicEnvVariable("SUPABASE_URL");
  },
  get SUPABASE_ANON_KEY() {
    return getPublicEnvVariable("SUPABASE_ANON_KEY");
  },
};

export const isPublicSupabaseConfigured = publicEnvSchema.safeParse({
  SUPABASE_URL: getPublicEnvVariable("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getPublicEnvVariable("SUPABASE_ANON_KEY"),
}).success;
