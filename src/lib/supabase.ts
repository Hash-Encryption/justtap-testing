import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const SUPABASE_URL = env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKET = "card-assets";
