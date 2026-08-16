import { createClient } from "@supabase/supabase-js";
import { env, isPublicSupabaseConfigured, getPublicEnvVariable } from "./env";

export function getSupabaseUrl(): string {
  return (
    getPublicEnvVariable("SUPABASE_URL") ||
    env.SUPABASE_URL ||
    "https://supabase.invalid"
  );
}

export function getSupabaseAnonKey(): string {
  return (
    getPublicEnvVariable("SUPABASE_ANON_KEY") ||
    env.SUPABASE_ANON_KEY ||
    "missing-public-anon-key"
  );
}

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseAnonKey();
export const IS_SUPABASE_CONFIGURED = isPublicSupabaseConfigured;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
  },
});

export const STORAGE_BUCKET = "card-assets";
