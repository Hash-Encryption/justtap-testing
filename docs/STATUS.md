# JustTap V2 Status

Last updated: 2026-08-12

## Current phase

Phase 05 — Admin Authority + NFC Tag Provisioning. Implementation, real Supabase DB migration, unit/integration testing, and live Cloudflare staging acceptance complete on `v2/05-admin-tag-provisioning` from approved Phase 04 checkpoint `518310d`; it remains UNCOMMITTED pending final authorization.

## Completed

- Established TanStack Start as the sole V2 target and froze the Next.js tree.
- Added architecture, plan, decisions, security, status, and repository inventory documents.
- Recorded the retirement of all demo-card and Pro Demo Mode behavior.
- Committed approved Phase 00 checkpoint as `9609dea`.
- Made TanStack `/c/$slug` the only public-card route and moved slug lookup into one server-only resolver.
- Passed Phase 01 acceptance and Phase 02 schema / versioned migration `20260811193000_phase02_cards_rls.sql` with owner RLS, narrow RPC, and client entitlement triggers at checkpoint `0f57b7cf2e3a1d0111ad55cacc54c72d5ebb187a`.
- Added Phase 03 migration `20260811220000_phase03_nfc_tags.sql` introducing `public.nfc_tags`, CSPRNG 32-char tokens, tag immutability, assignment timestamp triggers, and `get_public_card_by_tag_token` RPC at checkpoint `f36faf245818a0dc770cccb28dbe3bad9769ae96`.
- Completed Phase 04 Authentication & Account Model at checkpoint `518310d`.
- Completed Phase 05 Admin Authority & NFC Tag Provisioning:
  - Database migration `20260812000000_phase05_admin_provisioning.sql` introducing server-side CSPRNG token generation (`generate_nfc_token()`), privileged RPCs (`admin_provision_nfc_tag`, `admin_assign_nfc_tag`, `admin_update_tag_status`, `admin_get_nfc_inventory`, `admin_search_cards_for_assignment`).
  - Strict database-level authorization: `has_role(auth.uid(), 'admin')` enforced inside `SECURITY DEFINER` RPCs with `42501` exception on unauthorized access.
  - Admin UI in `src/routes/admin.tsx` equipped with NFC Inventory & Provisioning tab.
  - Reassignment model preserves permanent token while updating target card and timestamp.
  - Narrow inventory & card search projections preventing private customer data leakage.
- Real Supabase Acceptance PASSED on project `nlumgigqlaymjiwgpvtp`:
  - Verified anonymous callers and normal authenticated users (User A & User B) are denied admin RPC access (`42501`).
  - Verified normal users cannot self-escalate into `public.user_roles`.
  - Verified trusted admin provisioning, token generation, card assignment, card reassignment, and status revocation.
- Cloudflare Pages Staging Deployment & Live Acceptance PASSED on project `justtap-v2-staging`:
  - Deployed worker artifact via Wrangler (`https://v2-05-admin-tag-provisioning.justtap-v2-staging.pages.dev`).
  - Verified `/admin` portal shell (200 OK), `/c/testing-admin` (200 OK), permanent tag `/t/:token` redirection (307 -> `/c/testing-admin`), vCard route (200 OK).
- Passed 64 automated unit, integration, RLS, and live staging tests (`npx vitest run`).
- TypeScript (`tsc -p tsconfig.v2.json`), ESLint (`npx eslint "src/**/*.{ts,tsx}" --fix`), production build (`npx vite build`), `git diff --check` passed cleanly.

## In progress

- Phase 05 final checkpoint review and authorization.

## Deferred work

- Phase 06 Card Editor redesign, Wallet, billing lifecycle, analytics redesign.

## Next phase

Do not begin Phase 06. Stop for Phase 05 final authorization.

