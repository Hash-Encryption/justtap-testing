import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nlumgigqlaymjiwgpvtp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdW1naWdxbGF5bWppd2dwdnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDIzMTcsImV4cCI6MjEwMTQ3ODMxN30.wkaEpQlCJQMenDKTd6NGVrtEHiieCiRAp2rs6u3uvAA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const STORAGE_BUCKET = 'card-assets';

