# JustTap V2 Status

Last updated: 2026-08-11

## Current phase

Phase 03 — Permanent NFC / QR Identity Infrastructure. Implementation, real Supabase migration verification, and live Cloudflare staging acceptance complete on `v2/03-permanent-tag-identity` from approved Phase 02 checkpoint `0f57b7cf2e3a1d0111ad55cacc54c72d5ebb187a`; it remains UNCOMMITTED pending final authorization.

## Completed

- Established TanStack Start as the sole V2 target and froze the Next.js tree.
- Added architecture, plan, decisions, security, status, and repository inventory documents.
- Recorded the retirement of all demo-card and Pro Demo Mode behavior.
- Committed approved Phase 00 checkpoint as `9609dea`.
- Made TanStack `/c/$slug` the only public-card route and moved slug lookup into one server-only resolver.
- Passed Phase 01 acceptance and Phase 02 schema / versioned migration `20260811193000_phase02_cards_rls.sql` with owner RLS, narrow RPC, and client entitlement triggers at checkpoint `0f57b7cf2e3a1d0111ad55cacc54c72d5ebb187a`.
- Added Phase 03 migration `20260811220000_phase03_nfc_tags.sql` introducing `public.nfc_tags`, 24-byte base64url CSPRNG tokens (32 chars), token immutability trigger, assignment timestamp trigger, RLS restrictions, and hardened `get_public_card_by_tag_token` RPC.
- Implemented `/t/$token` route in `src/routes/t.$token.tsx` issuing HTTP redirects (307/302) to `/c/$slug`.
- Real Supabase Acceptance PASSED on project `nlumgigqlaymjiwgpvtp`:
  - `20260811193000_phase02_cards_rls.sql` & `20260811220000_phase03_nfc_tags.sql` applied.
  - Direct anonymous `public.nfc_tags` access blocked with Postgres `42501`.
  - RPC function `get_public_card_by_tag_token` active and functioning.
- Cloudflare Pages Staging Deployment & Live Acceptance PASSED on project `justtap-v2-staging`:
  - Worker artifact deployed via Wrangler (`https://justtap-v2-staging.pages.dev`).
  - Homepage (`/` -> 200 OK) & Auth (`/auth` -> 200 OK) verified.
  - Active public card (`/c/testing-admin` -> 200 OK) & missing card (`/c/missing-slug` -> 404) verified.
  - Active permanent tag (`/t/:token` -> 307 -> `/c/testing-admin`) verified.
  - Live slug-rename invariant verified without Worker rebuild.
  - Malformed & unknown tokens return safe 404.
- Passed 46 automated unit, integration, and live staging tests (`npx vitest run`).

## In progress

- Phase 03 final checkpoint approval.

## Deferred work

- Provisioning UI, dashboard redesign, QR download UI, Apple/Google Wallet, billing, analytics redesign, new card templates.

## Next phase

Do not begin Phase 04. Stop for Phase 03 final authorization.
