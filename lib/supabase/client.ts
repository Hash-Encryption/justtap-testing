import { createClient } from "@supabase/supabase-js";

// Frozen legacy Next.js client. Inert values keep imports safe without embedding
// environment-specific configuration; requests fail until legacy env values exist.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.invalid";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-public-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const STORAGE_BUCKET = "card-assets";
