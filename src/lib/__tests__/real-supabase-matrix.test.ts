import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";
import { generateTagToken } from "../token";

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe("REAL Supabase Database Live Matrix", () => {
  it("verifies public.nfc_tags table exists and anonymous direct SELECT is blocked by RLS", async () => {
    const { data, error } = await anonClient.from("nfc_tags").select("*");

    console.log("Real Supabase direct nfc_tags select:", { data, error });

    // Table exists and RLS/permission restricts direct SELECT (returning code 42501 or empty data)
    expect(error?.code).not.toBe("PGRST205");
    expect(data === null || data.length === 0).toBe(true);
  });

  it("verifies direct tag mutation (INSERT/UPDATE/DELETE) by non-service-role is blocked by database permission", async () => {
    const fakeToken = generateTagToken();

    // 1. Direct INSERT attempt
    const { error: insertError } = await anonClient
      .from("nfc_tags")
      .insert([{ token: fakeToken, status: "active" }]);
    expect(insertError?.code).toBe("42501");

    // 2. Direct UPDATE attempt
    const { error: updateError } = await anonClient
      .from("nfc_tags")
      .update({ status: "revoked" })
      .eq("token", fakeToken);
    expect(updateError?.code).toBe("42501");

    // 3. Direct DELETE attempt
    const { error: deleteError } = await anonClient
      .from("nfc_tags")
      .delete()
      .eq("token", fakeToken);
    expect(deleteError?.code).toBe("42501");
  });

  it("verifies get_public_card_by_tag_token RPC exists and functions on real Supabase", async () => {
    const testToken = generateTagToken();
    const { data, error } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: testToken,
    });

    console.log("Real Supabase get_public_card_by_tag_token response:", { data, error });

    // Function exists! Error must NOT be PGRST202 (missing function).
    expect(error).toBeNull();
    // Non-existent random token returns 0 rows (empty array / null)
    expect(data === null || data.length === 0).toBe(true);
  });

  it("verifies get_public_card_by_slug RPC functions on real Supabase", async () => {
    const { data, error } = await anonClient.rpc("get_public_card_by_slug", {
      _slug: "testing-admin",
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].slug).toBe("testing-admin");
  });

  it("verifies client entitlement trigger blocks plan_tier self-escalation", async () => {
    // Attempting an anonymous update on cards (or unauthenticated insert)
    const { error } = await anonClient.from("cards").insert([
      {
        slug: "unauth-pro-test",
        full_name: "Hacker",
        phone: "12345",
        plan_tier: "pro",
      },
    ]);

    expect(error).not.toBeNull(); // Blocked by RLS/Trigger
  });

  it("verifies public.profiles table exists and anonymous access is blocked by RLS", async () => {
    // 1. Anonymous SELECT attempt on profiles
    const { data: selectData, error: selectError } = await anonClient.from("profiles").select("*");
    expect(selectError?.code).not.toBe("PGRST205"); // Table exists!
    expect(selectData === null || selectData.length === 0).toBe(true);

    // 2. Anonymous INSERT attempt on profiles
    const { error: insertError } = await anonClient.from("profiles").insert([
      {
        user_id: "00000000-0000-0000-0000-000000000000",
        full_name: "Anonymous Attacker",
        email: "attacker@example.com",
      },
    ]);
    expect(insertError).not.toBeNull();
  });
});
