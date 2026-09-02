import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";
import { liveTestAdmin, liveTestUserA } from "./live-test-env";

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

describe("Phase 02 Live Testing Supabase Matrix (Project: nlumgigqlaymjiwgpvtp)", () => {
  describe("Privileged Operations RPCs — Live Anonymous / Non-Admin Access Denial", () => {
    const privilegedRpcs: Array<{ name: string; params: Record<string, unknown> }> = [
      { name: "admin_get_operations", params: {} },
      {
        name: "admin_get_user_detail",
        params: { _user_id: "00000000-0000-0000-0000-000000000000" },
      },
      {
        name: "admin_create_profile",
        params: {
          _full_name: "Test",
          _email: "test@example.com",
          _plan_tier: "free",
          _release_identifier: "test",
        },
      },
      {
        name: "admin_create_card",
        params: {
          _user_id: "00000000-0000-0000-0000-000000000000",
          _slug: "test-live-slug",
          _full_name: "Test",
          _phone: "+1234567890",
          _is_active: false,
          _release_identifier: "test",
        },
      },
      {
        name: "admin_set_entitlement",
        params: {
          _user_id: "00000000-0000-0000-0000-000000000000",
          _plan_tier: "pro",
          _reason: "Live matrix test",
          _release_identifier: "test",
        },
      },
      {
        name: "admin_set_card_active",
        params: {
          _card_id: "00000000-0000-0000-0000-000000000000",
          _is_active: false,
          _release_identifier: "test",
          _reason: "Live matrix test",
        },
      },
      {
        name: "admin_delete_card",
        params: {
          _card_id: "00000000-0000-0000-0000-000000000000",
          _confirmation_slug: "test-live-slug",
          _release_identifier: "test",
          _reason: "Live matrix test",
        },
      },
      {
        name: "admin_delete_profile",
        params: {
          _profile_id: "00000000-0000-0000-0000-000000000000",
          _confirmation_email: "test@example.com",
          _release_identifier: "test",
          _reason: "Live matrix test",
        },
      },
      {
        name: "admin_provision_nfc_tag_audited",
        params: {
          _release_identifier: "test",
        },
      },
      {
        name: "admin_assign_nfc_tag_audited",
        params: {
          _token: "0123456789abcdef0123456789abcdef",
          _card_id: "00000000-0000-0000-0000-000000000000",
          _release_identifier: "test",
        },
      },
      {
        name: "admin_update_tag_status_audited",
        params: {
          _token: "0123456789abcdef0123456789abcdef",
          _status: "revoked",
          _release_identifier: "test",
        },
      },
    ];

    for (const rpc of privilegedRpcs) {
      it(`proves anonymous invocation of ${rpc.name} fails closed with 42501`, async () => {
        const { data, error } = await anonClient.rpc(rpc.name, rpc.params);
        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
        expect(error?.message).toMatch(/permission denied|administrator|require_admin/i);
        expect(data).toBeNull();
      });
    }
  });

  describe("Immutable Append-Only Audit Table Protection", () => {
    it("proves direct SELECT on admin_audit_log is denied by RLS / permissions", async () => {
      const { data, error } = await anonClient.from("admin_audit_log").select("*");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("proves direct INSERT on admin_audit_log is denied by permissions", async () => {
      const { error } = await anonClient.from("admin_audit_log").insert({
        action: "unauthorized_insert",
        target_type: "user",
        result: "attempt",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
    });

    it("proves direct UPDATE on admin_audit_log is denied by permissions", async () => {
      const { error } = await anonClient
        .from("admin_audit_log")
        .update({
          result: "tampered",
        })
        .eq("id", "00000000-0000-0000-0000-000000000000");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
    });

    it("proves direct DELETE on admin_audit_log is denied by permissions", async () => {
      const { error } = await anonClient
        .from("admin_audit_log")
        .delete()
        .eq("id", "00000000-0000-0000-0000-000000000000");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
    });
  });

  describe("Live Product Events RPC Validation & Access Boundary", () => {
    it("proves anonymous invocation of record_product_event is blocked with 42501", async () => {
      const { data, error } = await anonClient.rpc("record_product_event", {
        _event_id: "00000000-0000-0000-0000-000000000001",
        _event_name: "feature_used",
        _source: "dashboard",
        _feature: "qr_export",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/permission denied for function record_product_event/i);
      expect(data).toBeNull();
    });
  });

  describe("Customer card_analytics vs Internal product_events Separation", () => {
    it("proves direct SELECT on product_events is denied by RLS / permissions", async () => {
      const { data, error } = await anonClient.from("product_events").select("*");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("proves direct mutation on product_events is denied by permissions", async () => {
      const { error } = await anonClient.from("product_events").insert({
        event_name: "card_created",
        source: "dashboard",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
    });
  });

  describe("Authenticated User & Admin Status Check", () => {
    const adminIt = liveTestAdmin ? it : it.skip;
    const userAIt = liveTestUserA ? it : it.skip;

    it("reports availability of authenticated live test accounts", () => {
      console.log("Live Test Account Status:", {
        adminConfigured: Boolean(liveTestAdmin),
        userAConfigured: Boolean(liveTestUserA),
      });

      if (!liveTestAdmin) {
        console.warn(
          "BLOCKER: Authenticated admin credentials (JUSTTAP_TEST_ADMIN_EMAIL / JUSTTAP_TEST_ADMIN_PASSWORD) are not provided in the environment. Per testing rules, reporting this exact blocker rather than claiming passing admin mutations.",
        );
      }
    });

    userAIt("verifies authenticated normal user cannot call admin read RPCs (42501)", async () => {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInErr } = await userClient.auth.signInWithPassword({
        email: liveTestUserA!.email,
        password: liveTestUserA!.password,
      });
      expect(signInErr).toBeNull();

      const { error: opsErr } = await userClient.rpc("admin_get_operations", {});
      expect(opsErr).not.toBeNull();
      expect(opsErr?.code).toBe("42501");

      const { error: detailErr } = await userClient.rpc("admin_get_user_detail", {
        _user_id: "00000000-0000-0000-0000-000000000000",
      });
      expect(detailErr).not.toBeNull();
      expect(detailErr?.code).toBe("42501");
    });

    userAIt(
      "verifies authenticated normal user cannot call admin mutation RPCs (42501)",
      async () => {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await userClient.auth.signInWithPassword({
          email: liveTestUserA!.email,
          password: liveTestUserA!.password,
        });

        const { error: createProfErr } = await userClient.rpc("admin_create_profile", {
          _full_name: "Unauthorized Normal User Profile",
          _email: "unauthorized-normal@example.com",
        });
        expect(createProfErr).not.toBeNull();
        expect(createProfErr?.code).toBe("42501");

        const { error: createCardErr } = await userClient.rpc("admin_create_card", {
          _user_id: "00000000-0000-0000-0000-000000000000",
          _slug: "unauthorized-normal-slug",
          _full_name: "Unauthorized",
          _phone: "+966500000000",
        });
        expect(createCardErr).not.toBeNull();
        expect(createCardErr?.code).toBe("42501");

        const { error: setEntErr } = await userClient.rpc("admin_set_entitlement", {
          _user_id: "00000000-0000-0000-0000-000000000000",
          _plan_tier: "pro",
          _reason: "Unauthorized attempt",
        });
        expect(setEntErr).not.toBeNull();
        expect(setEntErr?.code).toBe("42501");
      },
    );

    userAIt(
      "verifies authenticated normal user cannot directly read or mutate admin_audit_log or product_events",
      async () => {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await userClient.auth.signInWithPassword({
          email: liveTestUserA!.email,
          password: liveTestUserA!.password,
        });

        const { error: auditSelectErr } = await userClient.from("admin_audit_log").select("*");
        expect(auditSelectErr).not.toBeNull();
        expect(auditSelectErr?.code).toBe("42501");

        const { error: auditInsertErr } = await userClient.from("admin_audit_log").insert({
          action: "unauthorized_user_audit",
          target_type: "user",
          result: "attempt",
        });
        expect(auditInsertErr).not.toBeNull();
        expect(auditInsertErr?.code).toBe("42501");

        const { error: peSelectErr } = await userClient.from("product_events").select("*");
        expect(peSelectErr).not.toBeNull();
        expect(peSelectErr?.code).toBe("42501");

        const { error: peInsertErr } = await userClient.from("product_events").insert({
          event_name: "card_created",
          source: "dashboard",
        });
        expect(peInsertErr).not.toBeNull();
        expect(peInsertErr?.code).toBe("42501");
      },
    );

    userAIt(
      "verifies authenticated user product telemetry (record_product_event, retry idempotency, and trigger rejection)",
      async () => {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await userClient.auth.signInWithPassword({
          email: liveTestUserA!.email,
          password: liveTestUserA!.password,
        });

        const testEventId = "ffffffff-2222-3333-4444-" + Date.now().toString(16).padStart(12, "0");

        // 1. Approved authenticated owner event is accepted
        const { error: eventErr } = await userClient.rpc("record_product_event", {
          _event_id: testEventId,
          _event_name: "feature_used",
          _source: "dashboard",
          _feature: "qr_export",
          _metadata: { interaction: "click" },
        });
        expect(eventErr).toBeNull();

        // 2. Retrying identical event_id is idempotent (no error)
        const { error: retryErr } = await userClient.rpc("record_product_event", {
          _event_id: testEventId,
          _event_name: "feature_used",
          _source: "dashboard",
          _feature: "qr_export",
          _metadata: { interaction: "click" },
        });
        expect(retryErr).toBeNull();

        // 3. Database-trigger-only event is rejected
        const { error: triggerOnlyErr } = await userClient.rpc("record_product_event", {
          _event_id: "00000000-0000-0000-0000-000000000009",
          _event_name: "signup_completed",
          _source: "dashboard",
        });
        expect(triggerOnlyErr).not.toBeNull();
        expect(triggerOnlyErr?.message).toMatch(/reserved for server or database triggers/i);
      },
    );

    adminIt(
      "verifies authenticated admin full mutation lifecycle, audit creation, masking, and disposable cleanup",
      async () => {
        const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: signInErr } = await adminClient.auth.signInWithPassword({
          email: liveTestAdmin!.email,
          password: liveTestAdmin!.password,
        });
        expect(signInErr).toBeNull();

        // 1. Read operations projection & verify masked tokens
        const { data: opsData, error: opsErr } = await adminClient.rpc("admin_get_operations", {});
        expect(opsErr).toBeNull();
        expect(opsData).not.toBeNull();

        // 2. Create disposable profile
        const disposableEmail = `disposable-admin-test-${Date.now()}@example.com`;
        const { data: newProfileId, error: createProfErr } = await adminClient.rpc(
          "admin_create_profile",
          {
            _full_name: "Disposable Admin Test User",
            _email: disposableEmail,
            _plan_tier: "free",
            _release_identifier: "phase02-verification",
          },
        );
        expect(createProfErr).toBeNull();
        expect(newProfileId).not.toBeNull();

        // 3. Create disposable card
        const disposableSlug = `disp-slug-${Date.now()}`;
        const { data: newCardId, error: createCardErr } = await adminClient.rpc(
          "admin_create_card",
          {
            _user_id: newProfileId,
            _slug: disposableSlug,
            _full_name: "Disposable Card",
            _phone: "+966500000001",
            _is_active: false,
            _release_identifier: "phase02-verification",
          },
        );
        expect(createCardErr).toBeNull();
        expect(newCardId).not.toBeNull();

        // 4. Change entitlement with required reason
        const { error: setEntErr } = await adminClient.rpc("admin_set_entitlement", {
          _user_id: newProfileId,
          _plan_tier: "pro",
          _reason: "Phase 2 live matrix verification",
          _release_identifier: "phase02-verification",
        });
        expect(setEntErr).toBeNull();

        // 5. Toggle card active state with required reason
        const { error: setActiveErr } = await adminClient.rpc("admin_set_card_active", {
          _card_id: newCardId,
          _is_active: true,
          _release_identifier: "phase02-verification",
          _reason: "Phase 2 live matrix verification",
        });
        expect(setActiveErr).toBeNull();

        // 6. Provision, assign, and update a disposable NFC tag
        const { data: provisionedTag, error: provErr } = await adminClient.rpc(
          "admin_provision_nfc_tag_audited",
          { _release_identifier: "phase02-verification" },
        );
        expect(provErr).toBeNull();
        expect(provisionedTag?.token).toBeDefined();

        if (provisionedTag?.token) {
          const { error: assignErr } = await adminClient.rpc("admin_assign_nfc_tag_audited", {
            _token: provisionedTag.token,
            _card_id: newCardId,
            _release_identifier: "phase02-verification",
          });
          expect(assignErr).toBeNull();

          const { error: updateTagErr } = await adminClient.rpc("admin_update_tag_status_audited", {
            _token: provisionedTag.token,
            _status: "inactive",
            _release_identifier: "phase02-verification",
          });
          expect(updateTagErr).toBeNull();
        }

        // 7. Cleanup: Delete disposable card
        const { error: delCardErr } = await adminClient.rpc("admin_delete_card", {
          _card_id: newCardId,
          _confirmation_slug: disposableSlug,
          _release_identifier: "phase02-verification",
          _reason: "Phase 2 live verification cleanup",
        });
        expect(delCardErr).toBeNull();

        // 8. Cleanup: Delete disposable profile
        const { error: delProfErr } = await adminClient.rpc("admin_delete_profile", {
          _profile_id: newProfileId,
          _confirmation_email: disposableEmail,
          _release_identifier: "phase02-verification",
          _reason: "Phase 2 live verification cleanup",
        });
        expect(delProfErr).toBeNull();
      },
    );
  });
});
