# JustTap Connections & Analytics Upgrade — Phase 00 Audit

Date: 2026-08-15
Phase: 00 — Testing repository, environment isolation, and architecture audit
Status: Audit complete; implementation is blocked until the non-production Supabase boundary is created

## 1. Scope and non-goals

This checkpoint establishes an isolated GitHub testing repository and documents the current architecture before the Connections and Analytics upgrade.

Phase 00 intentionally made no product-code, production, database, migration, Wallet, or feature changes. It did not begin Phase 01.

## 2. Exact production baseline

| Item                  | Verified value                             |
| --------------------- | ------------------------------------------ |
| Production repository | `Hash-Encryption/JustTap`                  |
| Production branch     | `main`                                     |
| Production local HEAD | `3c6c27b5543544fbaf5a5d302e0d10600fdc0562` |
| Fetched `origin/main` | `3c6c27b5543544fbaf5a5d302e0d10600fdc0562` |
| Production worktree   | Clean at baseline verification             |
| Repository visibility | Private                                    |

The testing repository was created from that exact commit and preserves the source history.

## 3. Testing repository checkpoint and remote safety

| Item                | Verified value                                           |
| ------------------- | -------------------------------------------------------- |
| Testing repository  | `Hash-Encryption/justtap-testing`                        |
| Visibility          | Private                                                  |
| Local path          | `C:\codexprojects\justtap-testing`                       |
| Initial `main`      | `3c6c27b5543544fbaf5a5d302e0d10600fdc0562`               |
| Audit branch        | `upgrade/00-architecture-audit`                          |
| `origin` fetch/push | `https://github.com/Hash-Encryption/justtap-testing.git` |
| `upstream` fetch    | `https://github.com/Hash-Encryption/JustTap.git`         |
| `upstream` push     | Disabled with `no_push://production-disabled`            |

The Phase 00 commit SHA is recorded in the handoff report because a commit cannot contain its own SHA.

### Git isolation status

**ISOLATED.** The testing branch can push only to the testing repository through its normal remote. The production repository remains available as a read-only fetch source, and force-push, rebase, amend, production push, and deployment were not used.

## 4. Environment isolation map

| Boundary              | Status                        | Evidence and consequence                                                                                                                                                          |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                | **ISOLATED**                  | Private testing repository, preserved history, testing-only push remote, production push disabled.                                                                                |
| Supabase              | **UNSAFE FOR IMPLEMENTATION** | Only the production JustTap project was found. No dedicated JustTap testing project, local Supabase stack, or test migration target exists.                                       |
| Cloudflare Pages      | **ISOLATED**                  | `justtap-v2-staging.pages.dev` is separate from production, but it is still linked to the older `Hash-Encryption/JustTap-V2-Staging` repository and is not ready for this branch. |
| Environment variables | **UNSAFE FOR IMPLEMENTATION** | The testing clone contains only the blank tracked example. It has no local secrets, and the staging Pages project lacks the server integration variables used in production.      |
| External integrations | **UNSAFE FOR IMPLEMENTATION** | Resend, WalletWallet, and arbitrary customer webhooks need explicit non-production credentials or safe disabled/stub behavior before implementation testing.                      |

### Required remediation before Phase 01

1. Create or explicitly authorize a dedicated JustTap testing Supabase project.
2. Apply the current schema/migration baseline to that project and verify its project reference differs from production.
3. Configure the testing deployment with testing-only Supabase public and server credentials.
4. Intentionally connect `justtap-v2-staging` deployments to `Hash-Encryption/justtap-testing`, without changing `justtap.pages.dev`.
5. Define safe non-production behavior for Resend, WalletWallet, and outbound webhooks before exercising them.

No production database may be used as the Phase 01 migration or write-test target.

## 5. Cloudflare Pages inventory and strategy

### Production

- Project: `justtap`
- Domain: `https://justtap.pages.dev`
- Repository/branch: `Hash-Encryption/JustTap` / `main`
- Build: `npm run build`
- Output: `dist`
- Automatic deployments: enabled
- Compatibility: `2026-08-11` with `nodejs_compat`

Production variable names were inventoried without exposing their values: `ADMIN_PASSWORD`, `ADMIN_SECRET_KEY`, `ADMIN_USERNAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `WALLET_API_KEY`.

### Existing staging surface

- Project: `justtap-v2-staging`
- Domain: `https://justtap-v2-staging.pages.dev`
- Current repository/branch: `Hash-Encryption/JustTap-V2-Staging` / `main`
- Build/output: `npm run build` / `dist`
- Automatic deployments: enabled
- Visible variable names: `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`

### Safe testing deployment strategy

Reuse the separate `justtap-v2-staging` Pages project only after its source is intentionally changed to the testing repository and dedicated testing environment values are installed. Keep the production `justtap` project, its production branch, variables, and domains untouched. Preview deployments should come from `upgrade/*` branches in the testing repository; promotion to the staging production branch should remain an explicit review action.

## 6. Application architecture and source of truth

`src/` is the authoritative TanStack application. The legacy `app/`, root `components/`, and root `lib/` trees are frozen inventory and must not become parallel implementations.

The public-card path is:

`/c/$slug` → route loader → `getPublicCardPageData` → server `resolvePublicCardFromSupabase` → `get_public_card_by_slug` RPC → narrow `PublicCard` projection → shared `CardView` renderer.

The dashboard edits the full owner-authorized card model. Public rendering consumes the database-controlled narrow projection. This shared renderer is the seam to preserve while Connections and Analytics are upgraded.

## 7. Current Connections architecture

### Public submission flow

`CardView` validates and sanitizes `card_id`, visitor name, phone, and note, then inserts directly from the browser into `card_leads`. The current client rate limit is in memory, scoped to one JavaScript context, and keyed only by card ID. It is not durable, IP-aware, or an abuse boundary.

After a successful insert, the client sends a fire-and-forget request to `/api/lead-email`. That route may send through Resend and may then trigger `/api/lead-webhook`.

### Existing lead data model

The live table shape and policies were confirmed read-only in Supabase. The repository's `supabase/schema.sql` inventory records:

- `id uuid` primary key, generated by `gen_random_uuid()`
- `card_id uuid` foreign key to `cards(id)` with cascade delete
- `sender_name text` required
- `sender_phone text` required
- `note text` optional
- `created_at timestamptz` defaulting to `now()`
- RLS enabled
- public insert policy
- authenticated owner select/delete policies
- `card_leads_card_id_idx`

The lead table exists in the legacy schema snapshot but not in the ordered migration history. Phase 01 must capture the live baseline in a reviewable, idempotent versioned migration before extending it.

### Dashboard lead management

`LeadsTab` selects all lead columns for a card, newest first, with no pagination. It supports delete and browser-side CSV export. Loading and empty states exist; a load error is currently rendered as an empty result. Access relies on database RLS, but the tab has no trusted Pro entitlement check.

### Connections gaps to address later

- No email, company, or job-title fields.
- Visitor note is the only note; there is no private owner note.
- No status, tags, qualification state, or indexed workflow filters.
- No server-authoritative active-card validation at submission.
- No durable rate limit, replay/idempotency protection, or retry model.
- No paginated owner query or explicit error state.
- Notification endpoints accept an unauthenticated, client-originated request after the insert.

## 8. Current Analytics architecture

### Event collection

`CardView` inserts `page_view` directly into `card_analytics` on mount and includes the raw browser user agent. The vCard server route resolves the active public card and attempts a `vcard_download` insert. The vCard response does not fail when the analytics insert fails.

There is no event identifier, session model, deduplication, idempotency key, source/medium field, NFC/QR attribution, or server-authoritative general event ingestion path.

### Existing analytics data model

The live table shape and policies were confirmed read-only in Supabase. The repository inventory records:

- `id uuid` primary key, generated by `gen_random_uuid()`
- `card_id uuid` foreign key to `cards(id)` with cascade delete
- `event_type text` required
- `user_agent text` optional
- `created_at timestamptz` defaulting to `now()`
- RLS enabled
- public insert restricted to `page_view` and `vcard_download`
- authenticated owner select/delete policies
- `card_analytics_card_id_idx`

Like leads, analytics exists in the legacy schema snapshot but not the ordered migration history.

### Dashboard analytics

`AnalyticsTab` fetches the newest 500 events and computes totals and recent activity in the browser. Consequently, displayed totals become incomplete above 500 events. It has no server aggregation, date range, comparison period, source breakdown, funnel, or explicit error state.

## 9. Public action tracking map

| Public action     | Current behavior                                         | Currently tracked     | Entitlement surface                     |
| ----------------- | -------------------------------------------------------- | --------------------- | --------------------------------------- |
| Profile view      | Render `/c/$slug`                                        | `page_view`           | Free                                    |
| Save Contact      | Download `/api/vcard/$slug`                              | `vcard_download`      | Free                                    |
| Phone             | `tel:` link                                              | No                    | Free                                    |
| Email             | `mailto:` link                                           | No                    | Free                                    |
| WhatsApp          | External WhatsApp URL                                    | No                    | Free                                    |
| LinkedIn          | External link                                            | No                    | Free                                    |
| Instagram         | External link                                            | No                    | Free                                    |
| X/Twitter         | External link                                            | No                    | Free                                    |
| Website           | External link                                            | No                    | Free                                    |
| Share             | Web Share API/fallback                                   | No                    | Free                                    |
| Exchange Info     | Insert `card_leads`, then notification request           | No analytics event    | Free                                    |
| Video interaction | Embedded video                                           | No                    | Pro/Enterprise public projection        |
| PDF               | External PDF link                                        | No                    | Pro/Enterprise public projection        |
| Booking           | External booking link                                    | No                    | Pro/Enterprise public projection        |
| Custom CTA        | External/custom link                                     | No                    | Pro/Enterprise public projection        |
| Wallet            | Wallet drawer/API surface                                | No                    | Pro/Enterprise server/public projection |
| NFC scan          | `/t/$token` redirect to current card slug                | No                    | Tag assignment/status                   |
| QR scan           | Resolves to profile, vCard payload, or permanent tag URL | No source attribution | Mixed by QR type                        |

Preview mode reuses the shared renderer but makes public actions inert. A baseline defect was observed: the public Wallet drawer state exists, but no call opening it was found. Google Wallet is linked from the drawer but no matching API route exists. These observations are preservation/regression inputs, not Phase 00 fixes.

## 10. NFC and permanent identity invariants

The NFC path is `/t/$token` → `get_public_card_by_tag_token` RPC → redirect to the card's current `/c/$slug` URL.

`nfc_tags` provides:

- immutable, unique, 32-character token identity
- nullable card assignment with `ON DELETE SET NULL`
- `active`, `inactive`, and `revoked` states
- direct table access revoked, with narrow RPC access
- server-generated cryptographically secure tokens
- admin-only assignment/status operations guarded inside `SECURITY DEFINER` RPCs
- terminal revocation behavior

The invariant is sound: the physical tag keeps a permanent token while the destination profile slug remains mutable. Honest NFC attribution should eventually be recorded at the server resolver before redirect, tied to the resolved tag/card and a trusted `nfc` source.

## 11. QR invariants

`QrTab` intentionally supports three distinct QR products:

1. **Dynamic Profile QR** — online URL to `/c/$slug`.
2. **Offline vCard QR** — raw vCard data that works without a network; it must never be converted to a URL.
3. **Permanent Tag QR** — `/t/$token` using the active customer tag token.

Standard PNG export is available broadly. High-resolution export, wallpaper generation, and Wallet-related surfaces are Pro-gated in the UI. The Offline vCard semantics are a hard regression boundary.

## 12. Entitlement architecture

The account/profile `plan_tier` is the trusted entitlement source. Database migrations prevent non-admin tier changes, default new card tiers from the owner profile, synchronize profile tier changes to owned cards, and repair drift. Public Pro fields are emitted through the narrow database projection only for `pro` or `enterprise` cards.

### Database/server-enforced today

- Public Pro content projection.
- Public branding projection.
- Wallet API eligibility.
- Owner/card access through RLS and database triggers.

### UI-only or incomplete today

- Dashboard Pro customization and QR controls are primarily cosmetic gates over RLS-protected card updates.
- Lead email and webhook endpoints label their settings as Pro but do not enforce trusted plan tier on the server.
- Leads and analytics tabs do not enforce a trusted Pro entitlement.

Future work must preserve the profile-to-card synchronization model and enforce paid-only behavior at the database or server boundary, not by hidden buttons alone.

## 13. Email and webhook delivery audit

### Email

`/api/lead-email` is an unauthenticated POST route. It accepts client data including `card_id` and test mode, reads the card using a service-role client when available, and falls back to the anon key. It checks `enable_email_alerts` but not trusted plan tier. It has no endpoint input schema, durable rate limit, idempotency key, retry queue, or timeout. Its response exposes recipient information that should remain private.

### Webhook

`/api/lead-webhook` is also an unauthenticated POST route and accepts client-controlled test mode. URL validation is limited to an HTTP-prefix check. It has no trusted paid-tier enforcement, signing, timeout, retry/idempotency model, private-network/SSRF defense, DNS rebinding defense, or redirect policy. Its response also exposes notification recipient information.

### Delivery ownership

Resend email, arbitrary outbound webhooks, and WalletWallet are server-side integrations. Their credentials must remain server-only and must never use `VITE_*`. Browser requests should submit public data to a narrow server/database boundary; the client should not decide entitlement, destination, or delivery policy.

## 14. Public/private/server security boundary

| Boundary      | Current data/actions                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public read   | Narrow public-card projection by slug; active NFC token to slug; public vCard response; entitled public Pro fields only.                             |
| Public write  | Raw `card_leads` insert; raw `card_analytics` insert restricted to two event types; unauthenticated notification route calls.                        |
| Owner-private | Full card records, profile, integration settings, leads, analytics, tag/customer views, and dashboard mutations through authenticated RLS/RPC paths. |
| Server-only   | Supabase service role, Resend key, WalletWallet key, admin credentials, admin RPC orchestration, and provider requests.                              |

Read-only anonymous checks against production returned empty arrays for direct lead and analytics selects. This did not reveal private rows, but it is not a substitute for the two-user authenticated RLS matrix that must run against the future testing project.

## 15. Wallet regression boundary

The Apple Wallet path is `src/routes/api/wallet.$slug.ts` → WalletWallet JSON API → signed `.pkpass` response. The server keeps `WALLET_API_KEY` private, enforces public Pro eligibility from the database projection, and prefers the permanent `/t/$token` URL in the pass barcode when a valid assigned token resolves to the card.

Wallet is preservation-only for this upgrade:

- no provider or certificate architecture change
- no public payload expansion
- no change to permanent-tag barcode semantics
- no secret movement into browser variables
- keep existing mapping, missing-key, network-error, entitlement, local-certificate, and staging-unavailable tests green

## 16. External integration and environment inventory

The application integrates with:

- Supabase database/auth/storage/RPC
- Resend for lead email
- WalletWallet for Apple Wallet pass generation
- customer-configured outbound webhooks

Tracked `.env.example` declares public `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PUBLIC_SITE_URL`; server-only `SUPABASE_SERVICE_ROLE_KEY`, admin credentials, `RESEND_API_KEY`, and `WALLET_API_KEY`; optional live-test credentials; and legacy `NEXT_PUBLIC_*` compatibility names.

The testing clone contains no `.env.local` and no credential values were copied from production. Production secrets were not printed or committed.

## 17. Baseline validation

Validation ran from `C:\codexprojects\justtap-testing` on the audit branch.

| Check                              | Result                       | Notes                                                                                                                                                                                                    |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                           | Pass with advisory           | Lockfile install succeeded; npm reported 4 known dependency vulnerabilities: 1 high and 3 critical. No automated dependency rewrite was attempted.                                                       |
| `npm run typecheck:v2`             | Pass                         | No TypeScript errors.                                                                                                                                                                                    |
| `npm run lint:v2`                  | Pass with warnings           | 0 errors, 7 existing Fast Refresh warnings.                                                                                                                                                              |
| `npm run security:scan`            | Pass                         | 189 tracked/unignored files scanned.                                                                                                                                                                     |
| Credential-free local Vitest suite | Pass                         | 14 files, 96 tests.                                                                                                                                                                                      |
| `npm run test:browser`             | Pass                         | 1 file, 3 automated browser tests.                                                                                                                                                                       |
| `npm run build`                    | Pass with warnings           | Cloudflare Pages/Nitro output generated successfully. Existing toolchain warnings are documented below.                                                                                                  |
| Aggregate `npm run test:v2`        | Expected environment failure | 14 files passed, 4 failed; 104 tests passed, 10 failed, 11 skipped. Testing env is intentionally absent, live suites default to `supabase.invalid`, and the existing staging acceptance URLs return 404. |

The aggregate failure must not be “fixed” by pointing tests at production. The failing groups are the anonymous RPC boundary test, live staging acceptance, real Supabase authentication, and the real Supabase two-user matrix. They become required acceptance tests after a dedicated testing Supabase project and deployment are configured.

Build warnings observed without changing the toolchain:

- `vite-tsconfig-paths` is now redundant with native Vite support.
- a server-env module is both statically and dynamically imported, preventing chunk separation.
- `inlineDynamicImports` is ignored when code splitting is enabled.
- Pages output configuration is overridden by the build adapter.

These are baseline observations, not Phase 00 scope expansions.

## 18. Phase 01 exact change surface

Phase 01 should begin only after the Supabase and deployment blockers in Section 4 are cleared. Its scope is the secure Connections data foundation, not analytics redesign.

Expected targets:

- `supabase/migrations/<timestamp>_connections_data_rls.sql`
- public lead submission server/RPC boundary under `src/routes/api/` and/or a narrow database RPC
- `src/lib/sanitization.ts` and focused validation helpers
- `src/components/card/CardView.tsx` for the minimum submission-path adaptation
- `src/components/dashboard/LeadsTab.tsx` for the minimum owner-safe data adaptation
- focused unit, RLS, two-user, anonymous, and live-staging tests

Expected data work:

- capture the current lead table/policies in ordered migration history
- add email, company, job title, visitor note, private owner note, status, and tag architecture as approved
- add explicit constraints, timestamps, and indexes for owner workflow queries
- enforce owner privacy and public insert safety in RLS/RPC/server code
- validate the target card is active
- add durable abuse control and an idempotency/replay strategy at the authoritative boundary
- preserve existing email/webhook behavior without expanding integration scope

### Must remain untouched in Phase 01

- production Supabase, Cloudflare Pages, repository, variables, and domains
- analytics event redesign and attribution implementation
- NFC permanent token and redirect invariants
- all three QR product semantics, especially Offline vCard
- WalletWallet provider architecture and public payload boundary
- profile/card entitlement synchronization
- legacy frozen application trees
- unrelated UI redesign or feature work

## 19. Decision and handoff

The Git repository and deployment surface are isolated. The database and server integration environments are not yet safe for implementation. Phase 01 is therefore **blocked pending a dedicated testing Supabase project and testing-only environment configuration**.

After that blocker is cleared, the shortest safe path is one versioned Connections migration, one narrow authoritative submission boundary, the minimum adaptations to the shared card/dashboard flows, and focused RLS plus regression evidence. Phase 01 must still end at its own clean, review-gated Git checkpoint.
