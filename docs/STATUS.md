# JustTap V2 Status

Last updated: 2026-09-04

## Current phase

Phase 4: Billing, Subscriptions, Physical-Card Commerce & Pricing System. Status: `IMPLEMENTED_VALIDATED_AWAITING_REVIEW`.

## Completed

- Completed Phase 4: Billing, Subscriptions, Physical-Card Commerce & Pricing System:
  - Database migration `20260904000000_phase04_billing_commerce_system.sql` introducing authoritative financial schema: `billing_plans`, `billing_prices`, `billing_offers`, `payment_methods`, `subscriptions`, `payments`, `payment_refunds`, `subscription_events`, `payment_events`, `payment_webhook_events`.
  - Authoritative database pricing catalog and updated physical card pricing to 149.00 SAR (`pvc_matte_black`).
  - Bundle commercial model: Initial purchase 199.00 SAR (1 yr Pro + 1 physical NFC card, saving 49 SAR), renewal strictly 99.00 SAR/year (Pro renewal only with 0 physical cards).
  - Account deletion data retention: Foreign keys `subscriptions.user_id`, `payments.user_id`, `card_orders.user_id`, and `payment_refunds.requested_by` use `ON DELETE SET NULL` to preserve historical financial ledgers.
  - Sensitive token boundary: Direct client SELECT on `payment_methods` revoked; narrow projection RPC `get_user_payment_methods()` excludes `provider_token_reference`.
  - Durable idempotency on bundle checkout creation (`create_bundle_order_and_subscription()`) and refund requests (`admin_request_refund()`).
  - Provider layer: Generic `PaymentProvider` interface and `DisabledPaymentProvider` returning controlled `PAYMENT_PROVIDER_NOT_CONFIGURED` domain errors without fake success.
  - Landing page pricing section in `src/components/landing/PricingSection.tsx` displaying Pro (99 SAR/yr), NFC Card (149 SAR), Featured Bundle (199 SAR initial, saves 49 SAR, renews 99 SAR/yr), and discoverable Free option.
  - Account Center Billing tab in `src/routes/account.tsx` with subscription overview, commercial upgrade cards, `BundleCheckoutDialog.tsx`, payment methods safe empty state, and billing history ledger.
  - Admin Operations Billing & Commerce portal in `src/components/admin/AdminBillingSection.tsx` with Billing Overview KPIs, Payments Ledger, Subscriptions Queue, Payment Detail modal, Refund Request modal (with balance validation and `requested` status), and Reconciliation diagnostics.
  - Comprehensive English & Arabic localization across all billing and pricing surfaces.
  - Full validation: 480 unit tests passing (19 skipped), `tsc -p tsconfig.v2.json` clean, `eslint` clean, `scan-secrets.mjs` clean (266 files), `vite build` clean.

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
- Completed Phase 07 Public Card Renderer implementation.
- Completed Testing-First Phase 2: Administrative Operations Portal, Product Analytics, and Privileged Telemetry:
  - Validated and restored authoritative migration `20260829010000_operations_product_analytics.sql` containing `require_admin()` authorization, `admin_audit_log`, `product_events`, forward-only timestamps (`cards.published_at`), and 12 audited RPC functions.
  - Fully removed legacy environment-token gateway (`src/routes/api/admin-auth.ts`) and removed all `ADMIN_USERNAME`/`ADMIN_PASSWORD` login forms from `/admin`.
  - Rebuilt `/admin` surface in `src/routes/admin.tsx` with strict `useAuth` + `useIsAdmin` (checking `public.user_roles`) protection, returning accessible unauthenticated and 403 Forbidden views when appropriate.
  - Implemented 7 operational tabs: Operations Overview (KPIs & tier distribution), Client Profiles (with truth-in-labeling "Delete Profile" and directory filters), Digital Cards (with `published_at` vs `Not tracked yet — collection begins from this testing release.`), Connections Summary (aggregate totals only, privacy-safe exclusion of visitor notes/messages), Product Analytics (DAU/WAU/MAU, event breakdown, recent stream, journey funnel with unavailable stages explicitly labeled), Append-Only Audit Log, and Preserved NFC Operations.
  - Implemented privacy-safe telemetry module `src/lib/product-events.ts` with database-enforced metadata schema, `event_id` deduplication, and genuine trigger points in `CardEditor.tsx`, `ProFeaturesTab.tsx`, and `ProUpgradeDialog.tsx` (where trial CTA emits `pro_preview_interaction` and never `pro_upgrade_clicked`).
  - Added comprehensive English & Arabic localization across all operational surfaces.
  - Authored contract document `docs/PRODUCT-EVENTS.md` confirming no approved retention pruning period exists.
  - All 36 unit tests pass (`operations.test.ts`, `product-events.test.ts`, `admin-portal.test.tsx`), Vite production build clean, TypeScript clean.
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
  - Added full bilingual English/Arabic localization with complete RTL support and zero hard-coded English in the UI (completed Phase 2 localization closure for all mini-preview badges, labels, and fallback examples).
  - Completed Final Mobile Natural-to-Sticky Editor Navigation & Smart Section Jump UX:
    - Converted mobile editor hotbar to normal document flow (`relative sm:sticky sm:top-4`), allowing it to scroll away smoothly on mobile without competing with or occluding section navigation.
    - Positioned `EditorSectionNav` naturally in document flow above phone preview with pure CSS sticky behavior (`sticky top-0 sm:top-24 z-30`), sticking smoothly when reaching the top of the viewport and releasing when scrolling back upward.
    - Implemented dynamic clearance in `handleSectionClick` and `PreviewFab` accounting for nav height so target section titles and live preview land cleanly below the sticky navigation without being obscured.
    - Preserved scroll-spy with click lock and internal horizontal scrolling inside the capsule for 375px–412px viewports.
  - Completed Logged-In Editor Sticky Nav Integration Fix:
    - Replaced `overflow-x-hidden` with `overflow-x-clip` on the logged-in dashboard root shell (`src/routes/dashboard.tsx`), eliminating ancestor scroll-container trapping that broke descendant `position: sticky` on mobile viewports.
    - Added `min-w-0` to the dashboard main container for robust width safety without layout changes.
    - Preserved natural-to-sticky behavior, dynamic clearance section jumping, scroll-spy, PreviewFab, and bottom nav coexistence across 375px, 390px, and 412px viewports in both English LTR and Arabic RTL.
    - Added side-by-side Guest Sandbox vs Logged-In Dashboard regression tests in `CardEditorUx.browser.test.tsx` proving identical sticky nav functionality.
  - Comprehensive test suite in `ProUpgrade.test.tsx` (171 tests), `CardEditorUx.test.tsx` (32 tests), and browser test suite across 6 files pass 100% (366 unit tests, 22 browser tests).
  - Clean TypeScript (`typecheck:v2`), ESLint (`lint:v2`), secret scan (`security:scan`), and production build (`build`).

## Release Readiness

JustTap Pro is fully polished, verified, and release-ready across all desktop, mobile, English, Arabic, Free preview, and Pro active experiences. Release readiness revalidated following Logged-In Editor Sticky Nav Integration Fix.
