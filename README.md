# JustTap

JustTap is a digital business card SaaS designed for physical NFC cards. Customers create and publish mobile-first cards that can be shared by link, QR code, or—after the planned NFC infrastructure is implemented—an immutable physical tag URL.

## Rebuild status

The repository is undergoing a controlled production-grade V2 migration. TanStack Start under `src/` is the target application. A legacy Next.js implementation remains under `app/`, root `components/`, and root `lib/` only so unique behavior can be inventoried and migrated safely; it is frozen for new feature work.

Phase 01 implements the dynamic public-card and slug core. It is awaiting architecture review and remains intentionally uncommitted under the phase checkpoint rule. Review [the current status](./docs/STATUS.md) before making changes.

## Target stack

- TanStack Start
- React and TypeScript
- Supabase Auth, PostgreSQL, RLS, and Storage
- Cloudflare with Vite/Nitro

The target has one router, one data-access architecture, and one public-card implementation. Public cards resolve dynamically at `/c/:slug`; future physical NFC tags will use immutable `/t/:token` URLs.

## Local development

Requirements:

- Node.js compatible with the versions in `package.json`
- npm 10.x
- a Supabase project or safe local Supabase configuration

Install dependencies:

```sh
npm install
```

Copy `.env.example` to `.env.local` and provide environment-specific values. Never commit the resulting file.

Run the TanStack V2 application:

```sh
npm run dev
```

Build the TanStack V2 application:

```sh
npm run build
```

The explicit `dev:vite` and `build:vite` aliases remain available. Frozen legacy verification, when deliberately required, uses `dev:legacy` or `build:legacy`; it is not production evidence for V2.

Validation commands:

```sh
npm run typecheck:v2
npm run lint:v2
npm run test:v2
```

## Environment variables

Public browser configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only configuration, as required by the active feature:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET_KEY`
- `RESEND_API_KEY`

Server-only secrets must not use a `VITE_*` or `NEXT_PUBLIC_*` prefix. The Supabase anonymous client key is public client configuration; a Supabase service-role key is privileged and must never enter a browser bundle.

## Repository guide

- [Architecture](./docs/ARCHITECTURE.md): current versus target design and permanent flows
- [Architectural decisions](./docs/DECISIONS.md): accepted V2 decisions and their reasons
- [V2 rebuild plan](./docs/V2-PLAN.md): phased implementation sequence
- [Current status](./docs/STATUS.md): concise operational memory and next phase
- [Security baseline](./docs/SECURITY.md): known risks and credential actions
- [Repository inventory](./docs/INVENTORY.md): current, duplicate, and legacy subsystem map
- [Agent contract](./AGENTS.md): mandatory rules for coding agents

## Migration warning

Do not remove the entire Next.js tree, change production database state, push, or deploy as an incidental cleanup. Each rebuild phase is reviewed separately, and the Lovable-connected Git history must be preserved.
