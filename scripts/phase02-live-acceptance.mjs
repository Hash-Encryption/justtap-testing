import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const active = "testing-admin";
const inactive = "phase01-updated-778e8350";
const missing = `phase02-missing-${Date.now()}`;
const fakeId = crypto.randomUUID();
const result = {};
const pack = (response) => ({
  blocked: Boolean(response.error),
  code: response.error?.code,
  rows: response.data?.length ?? 0,
});

result.select_all = pack(await client.from("cards").select("*"));
result.select_active = pack(
  await client.from("cards").select("id,slug,user_id,plan_tier,is_active").eq("slug", active),
);
result.select_inactive = pack(
  await client.from("cards").select("id,slug,user_id,plan_tier,is_active").eq("slug", inactive),
);
result.select_internal = pack(
  await client.from("cards").select("user_id,plan_tier,pro_features"),
);
const enumeration = await client.from("cards").select("id", { count: "exact" });
result.enumerate = {
  blocked: Boolean(enumeration.error),
  code: enumeration.error?.code,
  count: enumeration.count,
};
result.insert = pack(
  await client.from("cards").insert({
    id: fakeId,
    user_id: fakeId,
    slug: "phase02-anon-insert",
    full_name: "Blocked",
    phone: "000",
  }),
);
result.update = pack(await client.from("cards").update({ bio: "blocked" }).eq("id", fakeId));
result.delete = pack(await client.from("cards").delete().eq("id", fakeId));
result.plan_tier = pack(
  await client.from("cards").update({ plan_tier: "pro" }).eq("id", fakeId),
);

const activeRpc = await client.rpc("get_public_card_by_slug", { _slug: active });
const inactiveRpc = await client.rpc("get_public_card_by_slug", { _slug: inactive });
const missingRpc = await client.rpc("get_public_card_by_slug", { _slug: missing });
const keys = activeRpc.data?.[0] ? Object.keys(activeRpc.data[0]).sort() : [];
const forbidden = [
  "user_id",
  "plan_tier",
  "is_active",
  "created_at",
  "notify_email",
  "webhook_url",
  "billing_customer_id",
  "subscription_id",
];
result.rpc_active = {
  ok: !activeRpc.error,
  code: activeRpc.error?.code,
  rows: activeRpc.data?.length ?? 0,
  keys,
  forbidden_keys: keys.filter((key) => forbidden.includes(key)),
};
result.rpc_inactive = {
  ok: !inactiveRpc.error,
  code: inactiveRpc.error?.code,
  rows: inactiveRpc.data?.length ?? 0,
};
result.rpc_missing = {
  ok: !missingRpc.error,
  code: missingRpc.error?.code,
  rows: missingRpc.data?.length ?? 0,
};

console.log(JSON.stringify(result, null, 2));
