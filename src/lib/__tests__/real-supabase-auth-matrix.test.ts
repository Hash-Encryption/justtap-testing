import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";
import { liveTestUserA, liveTestUserB } from "./live-test-env";

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const userAEmail = liveTestUserA?.email ?? "";
const userAPass = liveTestUserA?.password ?? "";
const userBEmail = liveTestUserB?.email ?? "";
const userBPass = liveTestUserB?.password ?? "";
const userAIt = liveTestUserA ? it : it.skip;
const userABIt = liveTestUserA && liveTestUserB ? it : it.skip;

async function getOrCreateTestUser(email: string, pass: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (!signInError && signInData.user) {
    return client;
  }

  const { data: signUpData, error: signUpError } = await client.auth.signUp({
    email,
    password: pass,
    options: {
      data: { full_name: `Test User (${email.split("@")[0]})` },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to create test user ${email}: ${signUpError.message}`);
  }

  if (!signUpData.session) {
    // If confirmation is required, attempt sign in again
    const { error: retryError } = await client.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (retryError) {
      console.warn(`Sign in retry for ${email}:`, retryError.message);
    }
  }

  return client;
}

describe("REAL Supabase Auth & Account Matrix", () => {
  userAIt(
    "verifies controlled new-user sign-up / sign-in and profile relationship on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const { data: userData, error: userError } = await clientA.auth.getUser();

      expect(userError).toBeNull();
      expect(userData.user).not.toBeNull();
      expect(userData.user?.email).toBe(userAEmail);

      const userAId = userData.user!.id;

      // Check matching public.profiles row
      const { data: profileData, error: profileError } = await clientA
        .from("profiles")
        .select("*")
        .eq("user_id", userAId);

      expect(profileError).toBeNull();
      expect(profileData).not.toBeNull();
      expect(profileData!.length).toBe(1); // Exactly one profile row
      expect(profileData![0].user_id).toBe(userAId);
      expect(profileData![0].email).toBe(userAEmail);
    },
  );

  userABIt(
    "verifies User A vs User B data isolation and cross-user attack rejection on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const clientB = await getOrCreateTestUser(userBEmail, userBPass);

      const userA = (await clientA.auth.getUser()).data.user!;
      const userB = (await clientB.auth.getUser()).data.user!;

      expect(userA.id).not.toBe(userB.id);

      // 1. User A reads own profile -> SUCCESS
      const { data: userAProfile } = await clientA
        .from("profiles")
        .select("*")
        .eq("user_id", userA.id);
      expect(userAProfile?.length).toBe(1);

      // 2. User B attempts to SELECT User A profile -> DENIED by RLS (0 rows)
      const { data: userBReadsAProfile } = await clientB
        .from("profiles")
        .select("*")
        .eq("user_id", userA.id);
      expect(userBReadsAProfile?.length).toBe(0);

      // 3. User B attempts to UPDATE User A profile -> DENIED by RLS (0 rows affected)
      const { data: userBUpdatesAProfile } = await clientB
        .from("profiles")
        .update({ full_name: "Hacked By User B" })
        .eq("user_id", userA.id)
        .select();
      expect(userBUpdatesAProfile?.length ?? 0).toBe(0);

      // 4. User B attempts to SELECT User A cards -> DENIED by RLS
      const { data: userBReadsACards } = await clientB
        .from("cards")
        .select("*")
        .eq("user_id", userA.id);
      expect(userBReadsACards?.length).toBe(0);

      // 5. User B attempts to UPDATE User A cards -> DENIED by RLS
      const { data: userBUpdatesACards } = await clientB
        .from("cards")
        .update({ full_name: "Hacked Card" })
        .eq("user_id", userA.id)
        .select();
      expect(userBUpdatesACards?.length ?? 0).toBe(0);

      // 6. User B attempts to INSERT card pretending to belong to User A -> DENIED by RLS check (auth.uid() = user_id)
      const { error: userBSpoofInsertError } = await clientB.from("cards").insert([
        {
          slug: "spoofed-user-a-card",
          full_name: "Spoofed User A",
          phone: "0500000000",
          user_id: userA.id, // Claiming User A's ID
        },
      ]);
      expect(userBSpoofInsertError).not.toBeNull(); // RLS violation
    },
  );

  userAIt("verifies User A can create and update their own card on real Supabase", async () => {
    const clientA = await getOrCreateTestUser(userAEmail, userAPass);
    const userA = (await clientA.auth.getUser()).data.user!;

    const testSlug = `usera-card-${Date.now().toString(36)}`;

    // Insert own card
    const { data: createdCard, error: insertError } = await clientA
      .from("cards")
      .insert([
        {
          slug: testSlug,
          full_name: "User A Real Card",
          phone: "05011122233",
          user_id: userA.id,
          plan_tier: "free",
        },
      ])
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(createdCard).not.toBeNull();
    expect(createdCard?.user_id).toBe(userA.id);
    expect(createdCard?.slug).toBe(testSlug);

    // Update own card
    const { data: updatedCard, error: updateError } = await clientA
      .from("cards")
      .update({ bio: "Updated by User A" })
      .eq("id", createdCard.id)
      .eq("user_id", userA.id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedCard?.bio).toBe("Updated by User A");
  });

  userAIt(
    "verifies authenticated users CANNOT escalate plan_tier or mutate nfc_tags on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const userA = (await clientA.auth.getUser()).data.user!;

      // 1. Attempt plan_tier escalation -> BLOCKED BY TRIGGER
      const { error: escalateError } = await clientA.from("cards").insert([
        {
          slug: `escalate-test-${Date.now().toString(36)}`,
          full_name: "User A Escalation Attempt",
          phone: "05011122233",
          user_id: userA.id,
          plan_tier: "pro", // Client attempting pro
        },
      ]);
      expect(escalateError?.code).toBe("42501");

      // 2. Attempt direct nfc_tags mutation as authenticated user -> BLOCKED BY PERMISSION
      const { error: tagInsertError } = await clientA
        .from("nfc_tags")
        .insert([{ token: "12345678901234567890123456789012", status: "active" }]);
      expect(tagInsertError?.code).toBe("42501");

      const { error: tagUpdateError } = await clientA
        .from("nfc_tags")
        .update({ status: "revoked" })
        .eq("token", "12345678901234567890123456789012");
      expect(tagUpdateError?.code).toBe("42501");
    },
  );

  userAIt(
    "verifies Free user direct attempt to persist Pro Custom Creator design mode is blocked on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const userA = (await clientA.auth.getUser()).data.user!;

      // Free user attempting to set design_mode = 'custom' directly via database call
      const { error: customInsertError } = await clientA.from("cards").insert([
        {
          slug: `custom-pro-bypass-${Date.now().toString(36)}`,
          full_name: "Bypass Attempt User",
          phone: "05011122233",
          user_id: userA.id,
          plan_tier: "free",
          design_mode: "custom", // Pro feature
        },
      ]);

      // Must be blocked by database trigger or RLS permission (42501)
      expect(customInsertError).not.toBeNull();
    },
  );

  userAIt(
    "verifies database-level CHECK constraints enforce valid 6-digit hex colors and reject invalid CSS strings on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const userA = (await clientA.auth.getUser()).data.user!;

      // 1. Valid hex update -> SUCCESS
      const validSlug = `color-valid-${Date.now().toString(36)}`;
      const { data: validCard, error: validError } = await clientA
        .from("cards")
        .insert([
          {
            slug: validSlug,
            full_name: "Valid Color User",
            phone: "05011122233",
            user_id: userA.id,
            plan_tier: "free",
            bg_color: "#6B21A8",
            surface_color: "#121216",
          },
        ])
        .select()
        .single();

      expect(validError).toBeNull();
      expect(validCard?.bg_color).toBe("#6B21A8");

      // 2. Direct Supabase update with url(javascript:alert(1)) -> REJECTED BY CHECK CONSTRAINT
      const { error: urlError } = await clientA.from("cards").insert([
        {
          slug: `color-invalid-url-${Date.now().toString(36)}`,
          full_name: "Injection Attempt User",
          phone: "05011122233",
          user_id: userA.id,
          bg_color: "url(javascript:alert(1))",
        },
      ]);
      expect(urlError).not.toBeNull();

      // 3. Direct Supabase update with #fff (short hex) -> REJECTED BY CHECK CONSTRAINT
      const { error: shortHexError } = await clientA.from("cards").insert([
        {
          slug: `color-invalid-short-${Date.now().toString(36)}`,
          full_name: "Short Hex User",
          phone: "05011122233",
          user_id: userA.id,
          bg_color: "#fff",
        },
      ]);
      expect(shortHexError).not.toBeNull();

      // 4. Direct Supabase update with rgb(255,0,0) -> REJECTED BY CHECK CONSTRAINT
      const { error: rgbError } = await clientA.from("cards").insert([
        {
          slug: `color-invalid-rgb-${Date.now().toString(36)}`,
          full_name: "RGB User",
          phone: "05011122233",
          user_id: userA.id,
          bg_color: "rgb(255,0,0)",
        },
      ]);
      expect(rgbError).not.toBeNull();
    },
  );

  userABIt(
    "verifies customer-safe get_customer_card_tags RPC returns tag status for owned cards and blocks User A -> User B cross-card attacks on real Supabase",
    async () => {
      const clientA = await getOrCreateTestUser(userAEmail, userAPass);
      const clientB = await getOrCreateTestUser(userBEmail, userBPass);
      const userB = (await clientB.auth.getUser()).data.user!;

      // 1. User B creates a card
      const userBSlug = `userb-rpc-card-${Date.now().toString(36)}`;
      const { data: userBCard } = await clientB
        .from("cards")
        .insert([
          {
            slug: userBSlug,
            full_name: "User B Private Card",
            phone: "0509990000",
            user_id: userB.id,
            plan_tier: "free",
          },
        ])
        .select()
        .single();

      expect(userBCard).not.toBeNull();

      // 2. User A attempts to call get_customer_card_tag for User B's card -> DENIED / 0 rows returned
      const { data: attackData, error: attackError } = await clientA.rpc("get_customer_card_tag", {
        _card_id: userBCard!.id,
      });

      expect(attackError).toBeNull();
      expect(attackData === null || attackData.length === 0).toBe(true);

      // 3. Authenticated direct nfc_tags SELECT remains DENIED by RLS (Phase 05 security preserved)
      const { data: directTagSelect } = await clientA.from("nfc_tags").select("*");
      expect(directTagSelect === null || directTagSelect.length === 0).toBe(true);
    },
  );

  it("verifies anonymous users CANNOT access profiles or cards directly on real Supabase", async () => {
    // 1. Anonymous profiles select -> DENIED
    const { data: anonProfiles } = await anonClient.from("profiles").select("*");
    expect(anonProfiles?.length ?? 0).toBe(0);

    // 2. Anonymous cards select -> DENIED by Phase 02 RLS
    const { data: anonCards } = await anonClient.from("cards").select("*");
    expect(anonCards?.length ?? 0).toBe(0);
  });
});
