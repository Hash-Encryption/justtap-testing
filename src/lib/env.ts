import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .default("https://nlumgigqlaymjiwgpvtp.supabase.co"),
  SUPABASE_ANON_KEY: z
    .string()
    .min(20, "VITE_SUPABASE_ANON_KEY must be a valid non-empty string")
    .default(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdW1naWdxbGF5bWppd2dwdnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDIzMTcsImV4cCI6MjEwMTQ3ODMxN30.wkaEpQlCJQMenDKTd6NGVrtEHiieCiRAp2rs6u3uvAA",
    ),
  ADMIN_USERNAME: z.string().default("hgendi3@gmail.com"),
  ADMIN_PASSWORD: z.string().default("Admin.Hash.9"),
  ADMIN_SECRET_KEY: z.string().default("justtap_admin_secret_token_key_99482"),
});

function getEnvVariable(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env[key]) return import.meta.env[key] as string;
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`] as string;
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
  }
  return undefined;
}

const rawEnv = {
  SUPABASE_URL: getEnvVariable("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnvVariable("SUPABASE_ANON_KEY"),
  ADMIN_USERNAME: getEnvVariable("ADMIN_USERNAME"),
  ADMIN_PASSWORD: getEnvVariable("ADMIN_PASSWORD"),
  ADMIN_SECRET_KEY: getEnvVariable("ADMIN_SECRET_KEY"),
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.warn(
    "⚠️ [Environment Warning] Missing or invalid environment variables:",
    parsed.error.format(),
  );
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
