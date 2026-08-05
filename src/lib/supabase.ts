import { createClient } from "@supabase/supabase-js";

// Publishable (anon) credentials — safe to ship in the client bundle.
export const SUPABASE_URL = "https://nlumgigqlaymjiwgpvtp.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdW1naWdxbGF5bWppd2dwdnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDIzMTcsImV4cCI6MjEwMTQ3ODMxN30.wkaEpQlCJQMenDKTd6NGVrtEHiieCiRAp2rs6u3uvAA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKET = "card-assets";
