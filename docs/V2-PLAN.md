# JustTap V2 Rebuild Plan

This plan is sequencing guidance, not permission to begin later phases. Each phase requires review of the repository's current state, its dependencies, and the relevant decisions before implementation. The phase boundaries may be reorganized when verified dependencies require it.

## Phase gates

Every phase must:

1. start from a reviewed Git state without discarding user work;
2. preserve the Lovable Git-history warning in `AGENTS.md`;
3. update `docs/STATUS.md` and any affected decision or inventory entry;
4. use versioned database migrations when schema or RLS changes are required;
5. run validation proportional to the changed behavior;
6. produce a completion report and stop for architecture review;
7. remain uncommitted until the user explicitly approves the phase;
8. receive one clean phase checkpoint commit after approval;
9. avoid push or deployment unless the user explicitly authorizes it.

No phase may begin while the previous phase is uncommitted, and work from different phases must never be combined in one commit.

## Phases

### 00 - Architecture Contract & Repository Memory

Establish the authoritative V2 architecture, inventory both applications, retire demo architecture as a permanent decision, sanitize embedded credentials, and create durable repository documentation. No feature rewrite or database change.

Exit gate: a fresh agent can identify the target framework, frozen legacy tree, risks, forbidden patterns, and next phase without prior chat history.

### 01 - Public Card + Slug Core

Make TanStack `/c/:slug` the single dynamic public-card path. Remove static generation, `c.html` rewrites, browser slug rediscovery, duplicate public lookups, and legacy public-card routing only after migration review. Enforce active-state behavior and distinguish 404 from service failure.

### 02 - Database Schema + Migrations + RLS

Introduce ordered migrations, define a narrow public-card projection, separate public and private fields, prevent owners from writing trusted fields such as `plan_tier`, and harden leads/analytics policies.

### 03 - Permanent NFC Tag Infrastructure

Add immutable `/t/:token` resolution, token lifecycle data, activation/deactivation, reassignment rules, auditability, and redirection to the active card without coupling the physical tag to a mutable slug.

### 04 - Authentication + Account Model

Consolidate Supabase Auth session handling, account/profile ownership, roles, route protection, and error behavior. Remove temporary or duplicated authentication paths after migration.

### 05 - Admin Portal + Card Provisioning

Replace custom admin credentials and direct privileged browser writes with server-verified authorization, card/customer provisioning, lifecycle controls, and audited administrative operations.

### 06 - Card Editor + Publishing

Repair the current save path, define editable fields, establish draft/publish behavior, handle slug changes safely, and keep trusted entitlement fields out of customer payloads.

### 07 - Public Card Renderer Cleanup

Consolidate the renderer, accessibility and mobile behavior, public actions, inactive states, metadata, and removal of migrated legacy components.

### 08 - Pro / Billing Entitlement

Implement trusted subscription ingestion and server/database-controlled entitlements. Remove all client authority and remaining demo-tier toggles.

### 09 - Leads

Harden lead submission, validation, abuse controls, owner access, retention, export, and notification triggers.

### 10 - Analytics

Define event contracts, trustworthy write paths, aggregation, retention, privacy rules, and owner/admin reporting.

### 11 - Server APIs + Email + Webhooks

Consolidate server endpoints, secret access, error reporting, durable rate limiting, email delivery, webhook signing/retries, and SSRF defenses.

### 12 - Apple / Google Wallet

Choose one Wallet architecture, implement signed pass generation and lifecycle behavior, and remove legacy/fallback implementations after verification.

### 13 - Media + Supabase Storage

Define storage buckets, ownership paths, upload validation, transformations, deletion, quotas, and public/private media boundaries.

### 14 - UI / Dead Code / Dependency Cleanup

Remove the fully migrated Next.js tree, duplicate components, obsolete configuration, dead dependencies, and stale route artifacts. Preserve mobile-first and bilingual behavior.

### 15 - Security Audit

Perform an end-to-end review of authentication, authorization, RLS, secrets, admin operations, SSRF, injection, rate limiting, logging, data minimization, and dependency risk.

### 16 - Automated Testing

Add unit, integration, route, database-policy, and browser coverage for public cards, NFC, auth, editor, admin, billing, leads, analytics, and error states.

### 17 - Cloudflare Production Verification

Reconcile Wrangler/Nitro configuration, validate environment bindings, preview the production artifact, verify dynamic routing and server functions on Cloudflare, and deploy only with explicit authorization and a rollback plan.

## Current next step

Phase 01 should begin only after Phase 00 review. Its first task should be a focused public-card request/data-flow design that defines the public projection, active-state semantics, and failure mapping before code removal.
