import { z } from "zod";

const adminEnvSchema = z.object({
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_SECRET_KEY: z.string().min(1),
});

function getServerVariable(name: string) {
  if (typeof process === "undefined") return undefined;
  const value = process.env?.[name];
  return value?.trim() || undefined;
}

export function getAdminEnvironment() {
  const parsed = adminEnvSchema.safeParse({
    ADMIN_USERNAME: getServerVariable("ADMIN_USERNAME"),
    ADMIN_PASSWORD: getServerVariable("ADMIN_PASSWORD"),
    ADMIN_SECRET_KEY: getServerVariable("ADMIN_SECRET_KEY"),
  });

  return parsed.success ? parsed.data : null;
}

export function getResendApiKey() {
  return getServerVariable("RESEND_API_KEY");
}

export function getSupabaseServiceRoleKey() {
  return getServerVariable("SUPABASE_SERVICE_ROLE_KEY");
}

export function getWalletApiKey() {
  return getServerVariable("WALLET_API_KEY");
}
