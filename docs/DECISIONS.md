# JustTap V2 Architectural Decisions

These accepted decisions are permanent repository memory until replaced by a later, explicitly recorded decision. Each exists to prevent a future implementation from reintroducing a known architectural conflict.

## ADR-001: TanStack Start is the only target application framework

- Status: Accepted
- Date: 2026-08-11
- Decision: New V2 application work uses TanStack Start, React, and TypeScript under `src/`.
- Why: The repository currently contains competing Next.js and TanStack applications, producing conflicting routes, configuration, builds, and source ownership. Lovable identifies the project as a TanStack Start template.
- Consequence: Default scripts and configuration must eventually be aligned with TanStack. No new feature work belongs in the legacy Next.js tree.

## ADR-002: The legacy Next.js implementation will be removed after migration

- Status: Accepted
- Date: 2026-08-11
- Decision: `app/`, root `components/`, root `lib/`, Next configuration, and Next-only dependencies are frozen and scheduled for controlled removal after unique behavior is inventoried or migrated.
- Why: Immediate deletion risks losing behavior such as the existing Wallet implementation and hides migration dependencies.
- Consequence: Inventory first; do not duplicate new fixes into both applications.

## ADR-003: Public card URLs `/c/:slug` are dynamic

- Status: Accepted
- Date: 2026-08-11
- Decision: A card is resolved from current Supabase state on request through the TanStack router.
- Why: Customer card creation and slug changes must not require static generation or deployment.
- Consequence: `generateStaticParams()`, `c.html`, static customer pages, query-string slug fallbacks, and browser pathname rediscovery are forbidden in the target.

## ADR-004: Physical NFC URLs use immutable `/t/:token`

- Status: Accepted
- Date: 2026-08-11
- Decision: A physical NFC tag will carry an immutable token URL that resolves to its active card.
- Why: A mutable customer slug must not require rewriting or replacing a physical NFC tag.
- Consequence: Token issuance and resolution are separate from slug ownership and will be implemented in Phase 03.

## ADR-005: Supabase is the source of truth

- Status: Accepted
- Date: 2026-08-11
- Decision: Persistent cards, identities, roles, NFC relationships, leads, analytics, entitlements, and media metadata are backed by Supabase.
- Why: Demo objects, localStorage fallbacks, and generated pages create divergent state and unpredictable routing.
- Consequence: Local browser storage may support drafts or preferences, but it is never authoritative production state.

## ADR-006: No demo-card architecture or special demo fallbacks

- Status: Accepted
- Date: 2026-08-11
- Decision: The old demo card, demo slug, Pro Demo Mode, fake card fallback, and automatic demo rendering are retired.
- Why: Special demo state created routing, entitlement, and rendering complexity and could mask real failures.
- Consequence: Remaining demo-specific code is removal debt; no agent may restore or expand it.

## ADR-007: Paid entitlement is server controlled

- Status: Accepted
- Date: 2026-08-11
- Decision: Clients cannot authoritatively set `plan_tier`, subscription state, or Pro authorization.
- Why: Browser-controlled entitlement is an escalation path and cannot be trusted for billing decisions.
- Consequence: Billing providers, verified webhooks, and trusted server/database logic own entitlement changes.

## ADR-008: Public and private card information have separate access boundaries

- Status: Accepted
- Date: 2026-08-11
- Decision: Public rendering receives a narrow public projection rather than an unrestricted card row.
- Why: A card being public does not make owner email, internal settings, billing fields, webhook URLs, or future private columns public.
- Consequence: Schema/RLS/API work must explicitly classify fields; broad public `select("*")` is not acceptable target behavior.

## ADR-009: Database evolution uses versioned migrations

- Status: Accepted
- Date: 2026-08-11
- Decision: Future schema, functions, grants, RLS, and storage-policy changes use ordered migrations.
- Why: One mutable `schema.sql` cannot reliably describe production history or support repeatable review and rollback planning.
- Consequence: The existing schema remains an inventory input, not the long-term migration mechanism.

## ADR-010: No hard-coded production secrets

- Status: Accepted
- Date: 2026-08-11
- Decision: Credentials and API secrets come from runtime server environment bindings. Public client configuration uses environment variables without service-role or third-party secrets.
- Why: Repository literals and public-prefixed variables can leak credentials through source history or browser bundles.
- Consequence: Missing required secrets fail closed; exposed historical credentials must be rotated outside the repository.

## ADR-011: Inactive public cards use the public not-found response

- Status: Accepted
- Date: 2026-08-11
- Decision: The public route returns the same 404 presentation for missing, invalid, and inactive slugs, while the server resolver keeps these outcomes distinct.
- Why: Public visitors do not need confirmation that a disabled customer record exists.
- Consequence: `is_active` must be explicitly true to render; database or network failures remain 5xx and are logged server-side.

## ADR-012: Card slugs use one conservative ASCII policy

- Status: Accepted
- Date: 2026-08-11
- Decision: Card slugs normalize trim, case, whitespace, and repeated hyphens, then validate as 2-48 characters in lowercase `[a-z0-9-]` segments without leading or trailing hyphens.
- Why: Creation, update, resolution, vCard, and OpenGraph paths need one deterministic identity rule.
- Consequence: Unsupported characters are rejected rather than silently deleted. No reserved words are required in Phase 01 because cards live under the isolated `/c/` namespace. The existing database unique constraint remains the authoritative duplicate invariant.
