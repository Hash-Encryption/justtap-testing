# JustTap V2 Status

Last updated: 2026-08-21

## Current phase

Custom Creator Design Engine & Pro Preset Palettes. Fixed custom color resolver fallback behavior, replaced the 4 Pro preset palettes with Executive Navy, Emerald Noir, Ivory Atelier, and Rose Noir, and added inline contrast notices. All 100 unit tests, typechecks, linter, and production build passed.

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
- Complete suite contains 107 automated tests: 96 passed and 11 mutation-capable live-auth tests safely skipped because optional credentials were not supplied; 0 failed (`npm run test:v2`).
- TypeScript, ESLint (0 errors; 8 pre-existing warnings), production build, secret scan, browser credential scan, public-route privilege scan, changed-file Prettier validation, and `git diff --check` passed.

## In progress

- Phase 07 independent checkpoint review and authorization.

## Deferred work

- Apple Wallet signing/certificate infrastructure, billing lifecycle, analytics redesign, and leads redesign remain deferred to their authorized phases.
- Controlled Real Supabase Pro-user Custom Creator persistence remains not verified because no controlled legitimate Pro fixture is available.

## Next phase

Do not begin Phase 08. Stop for Phase 07 final checkpoint review and authorization.
