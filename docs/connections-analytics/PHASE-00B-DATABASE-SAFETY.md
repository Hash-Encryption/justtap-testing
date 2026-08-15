# Phase 00B — Shared Database Safety Preflight

Date: 2026-08-15

## Approved target

- Git branch: `upgrade/00b-testing-environment`
- Starting checkpoint: `e8832f0b544031f16717f8c310f0db1fee7c86b2`
- Supabase project: `Digital Business Cards`
- Project reference: `nlumgigqlaymjiwgpvtp`
- Status at verification: `ACTIVE_HEALTHY`
- Only `C:\codexprojects\justtap-testing` was linked. Local link metadata is ignored by Git.

The owner-approved architecture intentionally uses this existing JustTap Supabase project with the isolated `Hash-Encryption/justtap-testing` code repository.

## Minimum preflight evidence

- The remote migration ledger was readable.
- All nine ordered local migration versions matched the remote ledger.
- A target-guarded `supabase db push --linked --dry-run` reported the remote database up to date with zero pending migrations, seeds, or roles. No SQL was applied.
- Live generated schema metadata confirmed `profiles`, `cards`, `card_leads`, `card_analytics`, `nfc_tags`, and `user_roles`, including the application-facing columns and relationships expected by the Phase 00 audit.
- Live RPC metadata confirmed the public card projection, permanent tag resolver, customer tag lookup, entitlement helper, and admin NFC RPC signatures.
- Live index inspection confirmed primary/unique indexes plus card slug, lead card, analytics card, and NFC token/card indexes.

## RLS baseline carried forward

The Phase 00 live audit and current ordered migration/schema evidence establish the baseline needed for Phase 01 planning:

- cards are owner-private through authenticated RLS; public reads use `get_public_card_by_slug`;
- anonymous visitors may insert the existing approved lead fields but cannot read private leads;
- owners may read/delete leads belonging to their cards;
- anonymous analytics inserts are restricted to the existing allowlist (`page_view`, `vcard_download`);
- owners may read/delete analytics belonging to their cards;
- direct NFC-tag access is revoked from anonymous/authenticated clients; narrow RPCs preserve permanent `/t/:token` identity;
- entitlement triggers and profile-to-card tier synchronization remain in place.

No exhaustive parity audit or broad integration matrix was repeated in Phase 00B. The interrupted synthetic RLS script was removed without being executed; it created no users or records.

## Permanent database rules

All future schema changes must:

1. verify project reference `nlumgigqlaymjiwgpvtp` before mutation;
2. use reviewed ordered migrations only;
3. preserve existing data, RLS, ownership boundaries, entitlement enforcement, and NFC identity;
4. remain additive where practical;
5. never reset, wipe, truncate, drop the application schema, disable RLS, broaden anonymous access, or expose service-role credentials;
6. stop on unexplained migration divergence or destructive/security risk.

## Phase boundary

Phase 00B added no migration and made no database, Connections, Analytics, Cloudflare, Wallet, email, or webhook change. Phase 01 migrations have not started.
