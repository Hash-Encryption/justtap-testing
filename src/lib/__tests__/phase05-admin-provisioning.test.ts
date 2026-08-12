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

describe("PHASE 05: Admin Authority & NFC Tag Provisioning Matrix", () => {
  it("verifies anonymous direct invocation of all 5 admin RPCs is denied by database authorization (42501)", async () => {
    // 1. Provisioning RPC
    const { error: provErr } = await anonClient.rpc("admin_provision_nfc_tag");
    expect(provErr?.code).toBe("42501");

    // 2. Assign RPC
    const { error: assignErr } = await anonClient.rpc("admin_assign_nfc_tag", {
      _token: "12345678901234567890123456789012",
      _card_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(assignErr?.code).toBe("42501");

    // 3. Update Status RPC
    const { error: statusErr } = await anonClient.rpc("admin_update_tag_status", {
      _token: "12345678901234567890123456789012",
      _status: "revoked",
    });
    expect(statusErr?.code).toBe("42501");

    // 4. Inventory RPC (Explicit 42501 exception check)
    const { error: invErr } = await anonClient.rpc("admin_get_nfc_inventory");
    expect(invErr?.code).toBe("42501");

    // 5. Search Cards RPC (Explicit 42501 exception check)
    const { error: searchErr } = await anonClient.rpc("admin_search_cards_for_assignment");
    expect(searchErr?.code).toBe("42501");
  });

  it("verifies normal authenticated users (User A & User B) cannot invoke any admin RPCs", async () => {
    const userAEmail = "phase05_usera@justtap.test";
    const userAPass = "Phase05TestPassword123!";
    const clientA = await getOrCreateTestUser(userAEmail, userAPass);

    // User A calls admin_provision_nfc_tag -> DENIED (42501)
    const { error: provErr } = await clientA.rpc("admin_provision_nfc_tag");
    expect(provErr?.code).toBe("42501");

    // User A calls admin_assign_nfc_tag -> DENIED (42501)
    const { error: assignErr } = await clientA.rpc("admin_assign_nfc_tag", {
      _token: "12345678901234567890123456789012",
      _card_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(assignErr?.code).toBe("42501");

    // User A calls admin_get_nfc_inventory -> DENIED (42501)
    const { error: invErr } = await clientA.rpc("admin_get_nfc_inventory");
    expect(invErr?.code).toBe("42501");

    // User A calls admin_search_cards_for_assignment -> DENIED (42501)
    const { error: searchErr } = await clientA.rpc("admin_search_cards_for_assignment");
    expect(searchErr?.code).toBe("42501");

    // User B check
    const userBEmail = "phase05_userb@justtap.test";
    const userBPass = "Phase05TestPassword123!";
    const clientB = await getOrCreateTestUser(userBEmail, userBPass);
    const { error: bProvErr } = await clientB.rpc("admin_provision_nfc_tag");
    expect(bProvErr?.code).toBe("42501");
  });

  it("verifies normal authenticated users cannot self-escalate into user_roles", async () => {
    const userAEmail = "phase05_usera@justtap.test";
    const userAPass = "Phase05TestPassword123!";
    const clientA = await getOrCreateTestUser(userAEmail, userAPass);
    const userA = (await clientA.auth.getUser()).data.user!;

    // Attempt to INSERT self as admin in public.user_roles -> DENIED BY RLS
    const { error: insertErr } = await clientA.from("user_roles").insert([
      {
        user_id: userA.id,
        role: "admin",
      },
    ]);
    expect(insertErr).not.toBeNull(); // Permission / RLS denial

    // Attempt to UPDATE public.user_roles -> DENIED BY RLS (0 rows affected)
    const { data: updateData } = await clientA
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", userA.id)
      .select();
    expect(updateData === null || updateData.length === 0).toBe(true);
  });

  it("verifies admin user can provision tags with server-generated tokens, assign, reassign, handle inactive tags, and enforce terminal revocation", async () => {
    // Sign in as authorized admin user
    const adminClient = await getOrCreateTestUser("hgendi3@gmail.com", "Admin.Hash.9");
    const adminUser = (await adminClient.auth.getUser()).data.user!;

    // 1. Provision Tag
    const { data: provData, error: provErr } = await adminClient.rpc("admin_provision_nfc_tag");

    expect(provErr).toBeNull();
    expect(provData).not.toBeNull();
    const newTag = Array.isArray(provData) ? provData[0] : provData;

    expect(newTag.token).toBeDefined();
    expect(newTag.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(newTag.status).toBe("active");

    const generatedToken = newTag.token;

    // 2. Create Card 1
    const testSlug = `phase05-card-${Date.now().toString(36)}`;
    const { data: createdCard, error: cardErr } = await adminClient
      .from("cards")
      .insert([
        {
          slug: testSlug,
          full_name: "Phase 05 Test Owner",
          phone: "0509998877",
          user_id: adminUser.id,
          plan_tier: "free",
        },
      ])
      .select()
      .single();

    expect(cardErr).toBeNull();
    expect(createdCard).not.toBeNull();

    // 3. Assign Tag to Card 1
    const { error: assignErr } = await adminClient.rpc("admin_assign_nfc_tag", {
      _token: generatedToken,
      _card_id: createdCard.id,
    });
    expect(assignErr).toBeNull();

    // Verify /t/:token resolves
    const { data: resolvedSlugData } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: generatedToken,
    });
    expect(resolvedSlugData?.[0]?.slug).toBe(testSlug);

    // 4. Test INACTIVE Tag behavior:
    // Deactivate tag
    const { error: deactivateErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: generatedToken,
      _status: "inactive",
    });
    expect(deactivateErr).toBeNull();

    // Inactive tag returns 0 rows on public /t/:token
    const { data: inactiveResolved } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: generatedToken,
    });
    expect(inactiveResolved === null || inactiveResolved.length === 0).toBe(true);

    // Inactive tag CAN still be reassigned to Card 2 by trusted admin
    const reassignSlug = `phase05-reassign-${Date.now().toString(36)}`;
    const { data: reassignCard } = await adminClient
      .from("cards")
      .insert([
        {
          slug: reassignSlug,
          full_name: "Phase 05 Reassign Owner",
          phone: "0509998877",
          user_id: adminUser.id,
          plan_tier: "free",
        },
      ])
      .select()
      .single();

    const { error: inactiveAssignErr } = await adminClient.rpc("admin_assign_nfc_tag", {
      _token: generatedToken,
      _card_id: reassignCard.id,
    });
    expect(inactiveAssignErr).toBeNull(); // Allowed for inactive tags!

    // Still does not resolve publicly while inactive
    const { data: inactiveResolved2 } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: generatedToken,
    });
    expect(inactiveResolved2 === null || inactiveResolved2.length === 0).toBe(true);

    // Reactivate tag
    const { error: reactivateErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: generatedToken,
      _status: "active",
    });
    expect(reactivateErr).toBeNull();

    // Now resolves publicly to the reassigned Card 2 slug!
    const { data: activeResolved } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: generatedToken,
    });
    expect(activeResolved?.[0]?.slug).toBe(reassignSlug);

    // 5. Test TERMINAL REVOCATION:
    // Revoke tag
    const { error: revokeErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: generatedToken,
      _status: "revoked",
    });
    expect(revokeErr).toBeNull();

    // Revoked tag returns 0 rows on public /t/:token
    const { data: revokedResolvedData } = await anonClient.rpc("get_public_card_by_tag_token", {
      _token: generatedToken,
    });
    expect(revokedResolvedData === null || revokedResolvedData.length === 0).toBe(true);

    // Revoked tag CANNOT be assigned/reassigned (returns 42501 error)
    const { error: revokedAssignErr } = await adminClient.rpc("admin_assign_nfc_tag", {
      _token: generatedToken,
      _card_id: createdCard.id,
    });
    expect(revokedAssignErr?.code).toBe("42501");

    // Revoked tag CANNOT be reactivated (revoked -> active returns 42501 error)
    const { error: reactivateRevokedErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: generatedToken,
      _status: "active",
    });
    expect(reactivateRevokedErr?.code).toBe("42501");

    // Revoked tag CANNOT be set to inactive (revoked -> inactive returns 42501 error)
    const { error: inactivateRevokedErr } = await adminClient.rpc("admin_update_tag_status", {
      _token: generatedToken,
      _status: "inactive",
    });
    expect(inactivateRevokedErr?.code).toBe("42501");
  });
});
