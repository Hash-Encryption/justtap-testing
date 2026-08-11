# JustTap V2 Status

Last updated: 2026-08-11

## Current phase

Phase 00 - Architecture Contract & Repository Memory. Implementation is complete on `v2/00-architecture-memory` and awaiting user review. Phase 01 has not started.

## Completed

- Established TanStack Start as the sole V2 target and froze the Next.js tree.
- Added architecture, plan, decisions, security, status, and repository inventory documents.
- Recorded the retirement of all demo-card and Pro Demo Mode behavior.
- Removed verified embedded admin credentials, Resend key, and duplicated Supabase client configuration from tracked source/docs.
- Made missing admin and email secrets fail closed.

## In progress

- User review of Phase 00 changes and external secret rotation.

## Known architectural conflicts

- Next.js and TanStack Start applications coexist.
- Default `dev`/`build` scripts and root TypeScript configuration still target Next.js.
- Vite/Nitro targets Cloudflare server output while `wrangler.json` still expects legacy static `out`.
- Public card, vCard, dashboard, admin, auth, and supporting components are duplicated.
- Legacy `/c/* -> /c.html`, static generation, and browser slug parsing remain in frozen code/config.
- Database state is represented by one mutable `supabase/schema.sql`, not migrations.
- The repository `lint` script invokes the removed/unsupported `next lint` command, and the root TypeScript configuration excludes V2 source.

## Known critical bugs

- TanStack production build is currently blocked because `src/routes/auth.tsx` imports the nonexistent `@/lib/supabase/client` module.
- TanStack `CardEditor` awaits an undeclared `query`, so its primary save path fails.
- V2 type checking also finds an invalid `\u7F` escape in `src/lib/sanitization.ts`, missing `Wallet` symbols in `CardView`, and a `ProFeatures` type mismatch for `enable_wallet_pass`.
- TanStack public card lookup maps both Supabase errors and missing records to the same not-found UI.
- TanStack public lookups do not enforce `is_active`, despite admin deactivation support.
- Client-side card/editor code can write `plan_tier`; Pro Demo Mode remains in both component trees.
- Public card and server routes use broad `select("*")` reads.

## Known security issues

- Previously exposed admin credentials and the Resend API key require external rotation.
- Public/private card fields are not separated; current cards RLS permits anonymous reads of every row.
- Client-controlled `plan_tier`, direct privileged browser operations, weak anonymous lead/analytics insertion, webhook SSRF, in-memory rate limiting, and custom admin tokens remain unresolved.

## Deferred work

- No feature routing, schema, RLS, auth, admin, billing, Wallet, analytics, lead, media, or UI rewrite was performed in Phase 00.
- No legacy tree or demo functionality was broadly removed.
- No production database, deployment, or remote branch was changed.

## Next phase

Phase 01 - Public Card + Slug Core. Begin with a reviewed public data projection and explicit 404/inactive/5xx contract, then consolidate dynamic `/c/:slug` routing without static or demo fallbacks.
