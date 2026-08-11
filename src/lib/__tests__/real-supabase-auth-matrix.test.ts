import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

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
  it("verifies controlled new-user sign-up / sign-in and profile relationship on real Supabase", async () => {
    const userAEmail = "phase04_usera@justtap.test";
    const userAPass = "Phase04TestPassword123!";

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
  });

  it("verifies User A vs User B data isolation and cross-user attack rejection on real Supabase", async () => {
    const userAEmail = "phase04_usera@justtap.test";
    const userAPass = "Phase04TestPassword123!";
    const userBEmail = "phase04_userb@justtap.test";
    const userBPass = "Phase04TestPassword123!";

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
  });

  it("verifies User A can create and update their own card on real Supabase", async () => {
    const userAEmail = "phase04_usera@justtap.test";
    const userAPass = "Phase04TestPassword123!";
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

  it("verifies authenticated users CANNOT escalate plan_tier or mutate nfc_tags on real Supabase", async () => {
    const userAEmail = "phase04_usera@justtap.test";
    const userAPass = "Phase04TestPassword123!";
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
  });

  it("verifies anonymous users CANNOT access profiles or cards directly on real Supabase", async () => {
    // 1. Anonymous profiles select -> DENIED
    const { data: anonProfiles } = await anonClient.from("profiles").select("*");
    expect(anonProfiles?.length ?? 0).toBe(0);

    // 2. Anonymous cards select -> DENIED by Phase 02 RLS
    const { data: anonCards } = await anonClient.from("cards").select("*");
    expect(anonCards?.length ?? 0).toBe(0);
  });
});
