# JustTap V2 Architecture

## Purpose and status

This document is the authoritative high-level architecture for the controlled JustTap V2 rebuild. It distinguishes the repository as it exists today from the architecture the project is moving toward. A target described here is not evidence that it has already been implemented.

As of Phase 00, two applications coexist in this repository:

- `src/` contains the newer TanStack Start application and is the only target for V2 development.
- `app/`, `components/`, and `lib/` contain a legacy Next.js application that is frozen pending migration inventory and controlled removal.

Do not add features to the legacy Next.js application. Do not delete it wholesale until the migration work identifies anything that must be retained.

## Current architecture

| Area                   | Current state                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Application frameworks | TanStack Start under `src/` and Next.js under `app/` both exist.                                            |
| Default npm scripts    | `dev` and `build` run Next.js; `dev:vite` and `build:vite` run the TanStack application.                    |
| TypeScript             | Root `tsconfig.json` is Next-oriented and excludes `src/**/*`.                                              |
| Lovable template       | `.lovable/project.json` identifies a TanStack Start template.                                               |
| Public cards           | TanStack has `/c/$slug`; Next has `app/c/[slug]` plus static-generation and browser slug fallback logic.    |
| Data access            | Browser and server code access Supabase directly in several places, frequently with broad card selects.     |
| Deployment             | Vite/Nitro targets Cloudflare Pages, but `wrangler.json` still points to the legacy static `out` directory. |
| Database evolution     | A single mutable `supabase/schema.sql` contains tables, grants, policies, triggers, and storage rules.      |
| NFC                    | No permanent immutable NFC tag resolver exists.                                                             |

The current conflicts and subsystem-level detail are recorded in [INVENTORY.md](./INVENTORY.md).

## Target architecture

JustTap V2 has one production application and one routing model:

- TanStack Start
- React
- TypeScript
- Supabase for authentication, persistence, row-level authorization, and storage
- Cloudflare for the deployed application runtime and edge delivery
- Server routes/functions for trusted operations and controlled public projections

The target has one implementation for each business capability. The browser may use Supabase directly only where an explicit RLS policy and narrow data shape make that access safe. Trusted operations, secrets, billing authority, and privileged data access stay on the server.

## Target flows

### Public card

```text
GET /c/:slug
  -> TanStack route resolves :slug
  -> one server/data lookup
  -> narrow public-card projection from Supabase
  -> active-state decision
  -> one public card renderer
```

New and renamed cards must work immediately from database state. They must not require a deployment, generated HTML file, `generateStaticParams()`, `c.html`, a query-string fallback, or browser pathname parsing.

The response model must distinguish:

- no matching public record: 404
- known but inactive card: controlled inactive response
- database or service failure: 5xx response with internal logging

### Future NFC resolution

```text
physical NFC tag
  -> immutable /t/:token
  -> server resolves NFC tag record
  -> active card relationship
  -> canonical public card
```

An NFC tag token is permanent. A customer may rename `/c/old-name` to `/c/new-name` without rewriting the physical tag. Token generation, storage, resolution, revocation, and audit behavior are Phase 03 work and do not exist yet.

### Dashboard and editor

```text
authenticated customer
  -> TanStack dashboard route
  -> Supabase Auth session
  -> owner-scoped reads/writes enforced by RLS
  -> card editor and publishing workflow
  -> storage uploads through owner-scoped policies
```

The editor may control editable presentation and contact data. It must not control paid entitlement, subscription state, administrative roles, or other trusted fields.

### Admin

```text
authenticated administrator
  -> server-verified authorization
  -> privileged server API
  -> audited Supabase operation
```

The current custom admin credential/token flow is temporary and unresolved. The target must not rely on reversible browser-stored tokens or privileged direct browser updates.

### Server APIs

Trusted TanStack server routes/functions will own capabilities such as:

- public-card projections where direct anonymous table access is too broad
- vCard generation and analytics recording
- NFC token resolution
- admin provisioning and lifecycle actions
- billing webhook verification and entitlement updates
- email delivery and outbound webhooks
- Wallet pass generation
- operations requiring service-role or third-party secrets

Server-only secrets must be read only in server code and must never use a `VITE_*` or `NEXT_PUBLIC_*` name.

### Supabase

Supabase is the persistent source of truth. Target access boundaries are explicit:

- public card data: narrow public fields only
- customer/private data: owner-scoped by authenticated identity and RLS
- admin data: role-checked and preferably mediated by server APIs
- service-role access: server-only and limited to operations that require it
- billing entitlement: written by trusted server/database logic only

Database changes will move to ordered, versioned migrations. Phase 00 does not change the live database or current RLS policies.

### Cloudflare

The target deployment is the TanStack Start server output produced by Vite/Nitro for Cloudflare. Static assets remain edge-served, but customer cards are dynamic routes. The legacy Next static export directory and `/c/* -> /c.html` rewrite are not part of the target. Production configuration will be reconciled and verified in later phases; no Phase 00 deployment is authorized.

## Permanent invariants

1. TanStack Start is the only target application framework and router.
2. Public cards use dynamic `/c/:slug` routing backed by Supabase state.
3. Physical NFC tags will use immutable `/t/:token` URLs.
4. There is one public-card lookup path and one renderer.
5. No demo-card record, demo slug, demo fallback, or Pro Demo Mode is allowed.
6. Browser code does not rediscover a slug already resolved by the router.
7. Public and private card data have separate access boundaries.
8. Paid entitlement is server/database controlled.
9. Database evolution uses versioned migrations.
10. Production credentials are never hard-coded or exposed through public client environment variables.

See [DECISIONS.md](./DECISIONS.md) for the reasons behind these constraints and [V2-PLAN.md](./V2-PLAN.md) for the implementation sequence.
