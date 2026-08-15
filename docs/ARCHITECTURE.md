# JustTap V2 Architecture

## Purpose and status

This document is the authoritative high-level architecture for the controlled JustTap V2 rebuild. It distinguishes the repository as it exists today from the architecture the project is moving toward. A target described here is not evidence that it has already been implemented.

As of Phase 01, two application trees coexist in this repository, but only TanStack participates in the default production build:

- `src/` contains the newer TanStack Start application and is the only target for V2 development.
- `app/`, `components/`, and `lib/` contain a legacy Next.js application that is frozen pending migration inventory and controlled removal.

Do not add features to the legacy Next.js application. Do not delete it wholesale until the migration work identifies anything that must be retained.

## Current architecture

| Area                   | Current state                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Application frameworks | TanStack Start under `src/` and Next.js under `app/` both exist.                                                                |
| Default npm scripts    | `dev`, `build`, and `start` target TanStack/Vite; explicit `*:legacy` scripts retain frozen Next inspection.                    |
| TypeScript             | `tsconfig.v2.json` type-checks TanStack source; root `tsconfig.json` remains legacy-oriented.                                   |
| Lovable template       | `.lovable/project.json` identifies a TanStack Start template.                                                                   |
| Public cards           | TanStack `/c/$slug` is the only public-card route, resolves Supabase dynamically, and renders through the shared V2 `CardView`. |
| Data access            | Public slug reads use one server-only resolver; other subsystems still contain direct Supabase access.                          |
| Deployment             | Vite/Nitro emits a Cloudflare Pages worker under `dist`; `wrangler.json` targets that artifact.                                 |
| Database evolution     | `supabase/migrations/` is the ordered migration source; `supabase/schema.sql` is a legacy inventory snapshot.                   |
| NFC                    | Immutable `/t/:token` resolution uses `public.nfc_tags` and redirects to the assigned active card's current slug.               |

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

Phase 01 intentionally returns the same public 404 for missing and inactive cards to avoid exposing disabled-card existence. The server resolver preserves the internal distinction.

The public browser model contains only `id`, `slug`, display name, phone, public email, title, company, bio, avatar/logo URLs, public presentation/design fields, WhatsApp display data, Arabic display fields, social links, public Pro content, and derived feature/branding flags. The public RPC returns custom design settings only for a database-entitled Pro/enterprise card and otherwise projects locked Classic V2 values. `user_id`, timestamps, raw activation state, raw plan tier, notification destinations, webhook configuration, private leads, analytics, and NFC inventory are not serialized to the public route.

The Phase 06 CardEditor preview and Phase 07 public route both render the card surface through `src/components/card/CardView.tsx`. Preview-only shells and draft data remain outside that shared component; public loading remains server-only and uses persisted, public-safe data.

### NFC resolution

```text
physical NFC tag
  -> immutable /t/:token
  -> server resolves NFC tag record
  -> active card relationship
  -> canonical public card
```

An NFC tag token is permanent. A customer may rename `/c/old-name` to `/c/new-name` without rewriting the physical tag. Generation, assignment, resolution, revocation, and inactive-card behavior are database/RPC controlled and preserve the permanent token.

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
  -> server/database-verified authorization (public.user_roles)
  -> privileged SECURITY DEFINER RPC / server API
  -> audited Supabase operation
```

Admin authority is verified strictly against `public.user_roles` (`role = 'admin'`) and enforced inside privileged database RPC functions (`admin_provision_nfc_tag`, `admin_assign_nfc_tag`, `admin_update_tag_status`, `admin_get_nfc_inventory`, `admin_search_cards_for_assignment`). Permanent physical NFC 32-character tokens are generated cryptographically on the server (`generate_nfc_token()`) and remain immutable. Non-admin users and anonymous callers are denied with error `42501`.

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

Database changes use ordered, versioned migrations. `public.get_public_card_by_slug(text)` is a `SECURITY DEFINER` function with a fixed `search_path`, one validated slug parameter, and an explicit public return shape. Anonymous callers cannot select `public.cards`; the function returns only active cards and never ownership, timestamps, plan tier, private notification settings, or webhook configuration. Authenticated owners operate only on their own rows through RLS, while a trigger rejects browser-role changes to `plan_tier`. Future billing/webhooks must use a trusted server or service-role operation to change entitlements.

Public analytics uses `public.record_public_card_event`, another fixed-search-path `SECURITY DEFINER` boundary. It derives an active card from the public slug, validates the canonical event and constrained privacy-safe metadata, and deduplicates a random event UUID per card. Direct public table inserts are revoked; owner/admin reads remain RLS-scoped.

### Cloudflare

The deployment artifact is the TanStack Start server output produced by Vite/Nitro in `dist`, including `dist/_worker.js` and a generated `_routes.json` that sends arbitrary non-asset paths to the worker. Static assets remain edge-served, while customer cards are dynamic routes. The legacy Next static export directory and `/c/* -> /c.html` rewrite are not part of the target. No Phase 01 deployment is authorized; production environment and live Cloudflare verification remain Phase 17 work.

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
