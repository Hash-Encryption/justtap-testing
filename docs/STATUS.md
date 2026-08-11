# JustTap V2 Status

Last updated: 2026-08-12

## Current phase

Phase 04 — Authentication + Account Model. Implementation, real Supabase DB verification, unit/integration testing, and live Cloudflare staging acceptance complete on `v2/04-auth-account-model` from approved Phase 03 checkpoint `f36faf245818a0dc770cccb28dbe3bad9769ae96`; it remains UNCOMMITTED pending final authorization.

## Completed

- Established TanStack Start as the sole V2 target and froze the Next.js tree.
- Added architecture, plan, decisions, security, status, and repository inventory documents.
- Recorded the retirement of all demo-card and Pro Demo Mode behavior.
- Committed approved Phase 00 checkpoint as `9609dea`.
- Made TanStack `/c/$slug` the only public-card route and moved slug lookup into one server-only resolver.
- Passed Phase 01 acceptance and Phase 02 schema / versioned migration `20260811193000_phase02_cards_rls.sql` with owner RLS, narrow RPC, and client entitlement triggers at checkpoint `0f57b7cf2e3a1d0111ad55cacc54c72d5ebb187a`.
- Added Phase 03 migration `20260811220000_phase03_nfc_tags.sql` introducing `public.nfc_tags`, CSPRNG 32-char tokens, tag immutability, assignment timestamp triggers, and `get_public_card_by_tag_token` RPC at checkpoint `f36faf245818a0dc770cccb28dbe3bad9769ae96`.
- Completed Phase 04 Authentication & Account Model:
  - Unified Supabase Auth session authority (`useAuth`, `auth.tsx`, `dashboard.tsx`).
  - Account/Profile identity model mapped to `public.profiles` (`auth.uid() = user_id`) and auto-created via `on_auth_user_created` trigger.
  - Safe return URL sanitization preventing open redirects (`validateRedirectUrl`).
  - Formatted user-facing authentication error handling (`formatAuthErrorMessage`).
  - Owner-scoped card mutation isolation (`saveCardRecord` with `user_id` RLS).
  - Protected owner routes (`/dashboard`) redirecting unauthenticated traffic safely to `/auth`.
- Real Supabase Acceptance PASSED on project `nlumgigqlaymjiwgpvtp`:
  - Verified `public.profiles` table exists and anonymous access (SELECT/INSERT/UPDATE) is denied by RLS.
  - Verified client entitlement trigger blocks `plan_tier` self-escalation.
  - Verified RPC functions (`get_public_card_by_slug`, `get_public_card_by_tag_token`).
- Cloudflare Pages Staging Deployment & Live Acceptance PASSED on project `justtap-v2-staging`:
  - Deployed worker artifact via Wrangler (`https://justtap-v2-staging.pages.dev`).
  - Verified homepage (`/` -> 200 OK), auth (`/auth` -> 200 OK), dashboard (`/dashboard` -> 200 OK), active public card (`/c/testing-admin` -> 200 OK), missing card (`/c/missing-slug` -> 404), active permanent tag (`/t/:token` -> 307 -> `/c/testing-admin`).
  - Zero hydration errors, worker exceptions, or redirect loops.
- Passed 52 automated unit, integration, RLS, and live staging tests (`npx vitest run`).
- TypeScript (`tsc --noEmit`), ESLint (`npm run lint:v2`), production build (`npm run build`), `git diff --check` passed cleanly.

## In progress

- Phase 04 final checkpoint review and authorization.

## Deferred work

- Phase 05 Admin Portal & Provisioning UI, Phase 06 Card Editor redesign, Wallet, billing lifecycle, analytics redesign.

## Next phase

Do not begin Phase 05. Stop for Phase 04 final authorization.

