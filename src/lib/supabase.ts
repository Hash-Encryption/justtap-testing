import { createClient } from "@supabase/supabase-js";
import { env, isPublicSupabaseConfigured } from "./env";

// Inert build-time values keep Vite compilation independent of production credentials.
// Runtime requests fail closed until the public Supabase environment is configured.
export const SUPABASE_URL = env.SUPABASE_URL ?? "https://supabase.invalid";
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY ?? "missing-public-anon-key";
export const IS_SUPABASE_CONFIGURED = isPublicSupabaseConfigured;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
  },
});

export const STORAGE_BUCKET = "card-assets";
