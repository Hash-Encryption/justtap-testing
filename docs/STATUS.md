# JustTap V2 Status

Last updated: 2026-08-22

## Current phase

7-Day Pro Trial (real server/database-controlled). Implements trusted `start_pro_trial()` SECURITY DEFINER RPC, versioned migration `20260822000000_trial_entitlement.sql`, TanStack server route `/api/trial-start`, `src/lib/billing.ts` client integration point, `isProEntitled()` helper replacing all `isPro` inline checks, trial status badge using trusted `trial_ends_at`, and updated CTA copy across all Pro upgrade surfaces. All 33 `ProUpgrade.test.tsx` tests pass (142 total unit tests passed). TypeScript clean, ESLint 0 errors, production build succeeded. Awaiting user approval before checkpoint commit.

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
- Completed and approved Phase 06 Dashboard + CardEditor + QR / Export at checkpoint `ca0e754329a43bea67f34e26a89d08d2300aa4a4`.
- Completed Phase 07 Public Card Renderer implementation:
  - `/c/:slug` and the CardEditor preview now use the same `CardView` visual renderer.
  - Classic V2 is locked to the official Obsidian, Royal Purple, Champagne, Outfit, Wave, Matte, and Minimal design.
  - Valid published Custom Creator designs support all persisted patterns, finishes, colors, corner styles, and fonts; inconsistent states fall back to Classic V2.
  - Migration `20260812050000_phase07_public_design_projection.sql` minimally extends the narrow public-card RPC with validated, entitlement-safe design output.
  - OpenGraph/canonical metadata, vCard, leads, analytics, and permanent NFC resolution remain connected to the existing public resolver.
  - Independent-review corrections removed tracked live credentials, made editor preview actions inert, emitted absolute crawler metadata, and added WCAG 4.5:1 custom-palette fallback checks.
  - Final-review corrections render every meaningful text/icon foreground at the exact opacity validated by `resolveCardDesign`, including company, bio, branding, share/Wallet labels, and contact content; the shared root entrance now uses only an 8px `translateY` over 240ms and never changes readable-content opacity.
  - Added a real headless-Chrome computed-style regression for the borderline `#7D7D7D` on `#000000` Custom palette. During the first running animation frame, root opacity, company/bio/branding opacity, and every ancestor opacity remain `1`, while the intended text color remains `rgb(125, 125, 125)`.
  - Replaced the PhoneFrame source-string assertion with a real headless-Chrome regression over `PhoneFrame -> CardPreview -> CardView`; the 320px viewport measures screen `244/244`, card `242/242`, dock `224/224`, and a fully contained 40px WhatsApp action in both LTR and RTL.
- Real Supabase Acceptance PASSED on project `nlumgigqlaymjiwgpvtp`:
  - Verified anonymous callers and normal authenticated users (User A & User B) are denied admin RPC access (`42501`).
  - Verified normal users cannot self-escalate into `public.user_roles`.
  - Verified trusted admin provisioning, token generation, card assignment, card reassignment, and status revocation.
- Cloudflare Pages Phase 07 staging deployment and live acceptance PASSED on project `justtap-v2-staging`:
  - Final root-opacity correction deployment `2745d8f9-2a8e-41a8-b705-a7ae49225d52` is available at `https://2745d8f9.justtap-v2-staging.pages.dev` and `https://v2-07-public-card-renderer.justtap-v2-staging.pages.dev`.
  - Verified active/missing cards, permanent tag redirect/revocation, vCard, anonymous dashboard privacy, dynamic post-deploy card creation, metadata, 390x844 and desktop rendering, mobile RTL, keyboard focus, live mid-animation root opacity `1`, transform-only entrance keyframes, contained dock actions, a functional public privacy-enhanced video iframe, and a clean browser console.
- Completed Phase 07 Public Card Renderer implementation and Cloudflare Pages staging verification.
- Completed Phase 2 Integrated Card Editor Preview with non-autopublish, PRO marker, and contextual CTA.
- Completed Phase 3 Connections Integrated Pro Preview:
  - Replaced static locked follow-up notice with safe interactive Free Pro Preview across private tags, follow-up status, and private owner note.
  - Free preview state remains strictly local in component memory; persistence action branches before Supabase write (`supabase.from("card_leads").update(...)`).
  - Added contextual "Upgrade to Save Follow-up" and "Upgrade to Export" actions integrated with shared `ProUpgradeDialog` (`connections_save`, `connections_export`).
  - Preserved Phase 2 non-auto-action rule: trial activation updates in-memory entitlement without auto-saving follow-up details or auto-downloading CSV; user explicitly triggers the final action.
  - Preview state survives trial activation in memory without unmounting `ConnectionsTab` or resetting user drafts.
  - Authorized active 7-day trial, Paid Pro, and Enterprise accounts maintain full real persistence and authorized CSV export without regressions.
  - Bilingual EN and Arabic support with native RTL layout.
  - All 66 unit tests in `ProUpgrade.test.tsx` pass (228 total unit tests passed, 11 browser tests passed, 0 failures).

## In progress

- Phase 3 complete — awaiting user approval of Phase 3 completion report.

  **Migration** `20260822000000_trial_entitlement.sql`:
  - `trial_started_at`, `trial_ends_at`, `trial_used` columns on `public.profiles`
  - `'trialing'` added to `cards_plan_tier_values` and `profiles_plan_tier_values` CHECK constraints
  - `cards_enforce_pro_design_features` trigger updated to allow active trialing accounts (with server-time expiry check via profiles JOIN)
  - `start_pro_trial()` SECURITY DEFINER RPC: one-per-account, records timestamps, returns `trial_ends_at`
  - `get_public_card_by_slug` rebuilt with inline expiry: `trialing AND trial_ends_at > now()` treated as Pro at query time — no background job needed

  **Server route** `src/routes/api/trial-start.ts`: rate-limited, calls `start_pro_trial()` via service-role client, returns `{ ok, trialEndsAt }`

  **Client** `src/lib/billing.ts`: `startProTrial(session)` → POST `/api/trial-start` → `{ ok, trialEndsAt }`. Client never touches `plan_tier`, `trial_started_at`, or `trial_ends_at` directly.

  **Types** `src/lib/card.ts`: `PlanTier` now includes `"trialing"`, `Card` has `trial_ends_at?: string | null`

  **Entitlement helper** `src/lib/card-design.ts`: `isProEntitled(card)` exported — replaces all `plan_tier === "pro" || plan_tier === "enterprise"` inline checks in `CardEditor`, `ProFeaturesTab`, and `resolveCardDesign`

  **UX** `ProUpgradeDialog`: `"Start 7-Day Free Trial"` CTA everywhere, `onTrialStarted` fires only after backend confirmation

  **Trial badge** in `CardEditor`: `"Pro Trial · N days remaining"` computed from trusted `trial_ends_at`

  **Tests 22–33**: all pass covering CTA, backend activation, second-trial rejection, client forgery prevention, active/expired entitlement, public RPC expiry logic, data preservation, Pro restoration, no-destructive-reset

## Deferred work

- Apple Wallet signing/certificate infrastructure, billing lifecycle, analytics redesign, and leads redesign remain deferred to their authorized phases.
- Controlled Real Supabase Pro-user Custom Creator persistence remains not verified because no controlled legitimate Pro fixture is available.
- Stripe payment method collection: BILLING EXTENSION POINT is clearly marked in `billing.ts` and `trial-start.ts`; no rebuild required when Stripe is wired.

## Next phase

Do not begin Phase 08 until the 7-Day Trial checkpoint commit is approved and committed.
