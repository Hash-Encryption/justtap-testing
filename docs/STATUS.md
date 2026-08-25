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
- Completed Phase 2: Integrated Card Editor Preview with non-autopublish, PRO marker, and contextual CTA.
- Completed Phase 3: Connections Integrated Pro Preview with non-autosave follow-up, non-auto-export, and contextual CTAs.
- Completed Phase 4: Integrated Analytics Pro Preview with deterministic sample data, PRO preview marker, and contextual CTA.
- Completed Phase 5: Integrated QR and Export Pro Preview with contextual CTA and non-autoexport.
- Completed Phase 6: Integrated Apple Wallet Pro Preview with contextual CTA, non-autoissue, and server-side entitlement checks.
- Completed Phase 7: Upgrade → Return → Continue + Final Integration across all Phase 1–6 experiences:
  - Unified `handleTrialStarted` in `src/routes/dashboard.tsx` updating selected card entitlement upon verified trial start without switching cards.
  - Connected authenticated `session` to `CardEditor` and `ProFeaturesTab`.
  - Connected `session` and `onTrialStarted` to `ProFeaturesTab` and `ProUpgradeDialog`.
  - Verified non-auto-execution across all 6 protected actions: Card Publish, Follow-up Save, Connections CSV Export, Analytics Live View, 2000px QR / Wallpaper Export, Apple Wallet Issuance, and Pro Features Save.
  - Verified context preservation across all tabs in working memory without unauthorized draft persistence.
- Completed Final Polish Phase 1 of 2: Fixed duplicate tab title, removed dead Apple Wallet feature card in Pro Features, and streamlined customer communication.
- Completed Final Polish Phase 2 of 2: Pro Features Experience + Final Pre-Release Polish:
  - Rebuilt Pro Features information architecture with customer-centric header ("Make Your Card Do More" / "اجعل بطاقتك تقدم المزيد").
  - Supported distinct Free ("PRO PREVIEW" + 7-day trial CTA + notice) vs Pro ("PRO ACTIVE" + "Pro Status: Active" + live publication notice) states.
  - Implemented 2-column desktop layout with controls on left and product-style mini-previews on right, cleanly stacking on mobile (~375px) with zero horizontal overflow.
  - Redesigned Video Introduction ("Add a Video Introduction" / "إضافة فيديو تعريفي") with live iframe embed and mockup placeholder.
  - Redesigned PDF / Document ("Share a PDF or Brochure" / "مشاركة ملف PDF أو بروشور") with label, upload, and document mockup preview.
  - Redesigned Appointment Booking ("Let People Book You" / "تمكين حجز المواعيد") with booking mockup preview.
  - Redesigned Main Action Button ("Add a Main Action" / "إضافة زر إجراء رئيسي") with action pill mockup preview.
  - Redesigned Connection Alerts ("New Connection Alerts" / "تنبيهات جهات الاتصال الجديدة") removing "(Main Feature)" tag and providing notification mockup preview.
  - Organized Webhook under collapsible "Advanced Integrations" / "التكاملات المتقدمة" section with accessible `aria-expanded` toggle.
  - Redesigned Own Brand ("Use Your Own Brand" / "استخدام هويتك الخاصة") with Before/After comparison cards.
  - Added sticky action bar: Pro users see "Save & Publish Features", Free users see "Upgrade to Activate" (opening `ProUpgradeDialog` with source `pro_features_save`).
  - Added full bilingual English/Arabic localization with complete RTL support and zero hard-coded English in the UI.
  - Comprehensive test suite in `ProUpgrade.test.tsx` (170 tests) and browser suite `ProFeaturesTab.browser.test.tsx` pass 100% (363 unit tests, 17 browser tests).
  - Clean TypeScript (`typecheck:v2`), ESLint (`lint:v2`), secret scan (`security:scan`), and production build (`build`).

## Release Readiness

JustTap Pro is fully polished, verified, and release-ready across all desktop, mobile, English, Arabic, Free preview, and Pro active experiences.

