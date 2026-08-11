# JustTap V2 Status

Last updated: 2026-08-11

## Current phase

Phase 01 - Public Card + Slug Core. Implementation and validation are complete on `v2/01-public-card-core`. The phase is intentionally uncommitted and awaiting architecture review under the phase checkpoint rule.

## Completed

- Established TanStack Start as the sole V2 target and froze the Next.js tree.
- Added architecture, plan, decisions, security, status, and repository inventory documents.
- Recorded the retirement of all demo-card and Pro Demo Mode behavior.
- Removed verified embedded admin credentials, Resend key, and duplicated Supabase client configuration from tracked source/docs.
- Made missing admin and email secrets fail closed.
- Committed the approved Phase 00 checkpoint as `9609dea`.
- Made TanStack `/c/$slug` the only public-card route and moved slug lookup into one server-only resolver.
- Added a narrow public browser model, active-card enforcement, explicit 404/inactive/5xx handling, and shared slug rules.
- Repaired CardEditor insert/update behavior and duplicate messaging without browser-controlled `plan_tier`.
- Kept the editor's `View live` link anchored to the persisted slug when a save fails, preventing a rejected duplicate draft from linking to another card.
- Removed public-card static generation, `c.html` routing, browser slug rediscovery, fake OpenGraph fallback, and Pro Demo Mode.
- Aligned default scripts and Wrangler output with the successfully built Cloudflare Pages worker in `dist`.
- Added 18 automated tests for slug, resolver, routing, architecture, and save/resolution behavior.
- Passed the real-Supabase Phase 01 acceptance matrix with the public/anon client: existing 200, missing 404, inactive 404, live CardEditor insert/update, immediate new-slug resolution without a restart, old-slug invalidation, duplicate-slug UX, and controlled resolver 500 behavior.

## In progress

- User architecture review of the uncommitted Phase 01 changes.
- External rotation of credentials identified during Phase 00.

## Known architectural conflicts

- Next.js and TanStack Start applications coexist.
- Root `tsconfig.json` remains Next-oriented, while `tsconfig.v2.json` is now authoritative for V2 checks.
- Dashboard, admin, auth, Wallet, and supporting components are still duplicated pending their planned phases.
- A legacy Wallet route still contains Next static-parameter logic but does not participate in the TanStack production build; Wallet migration is Phase 12.
- Database state is represented by one mutable `supabase/schema.sql`, not migrations.
- The legacy `lint` script remains invalid; `lint:v2` is the validated TanStack command.

## Known critical bugs

- No known Phase 01 build blocker remains.
- Public table RLS still allows anonymous full-row reads outside the new resolver; a live anonymous query could select the dedicated inactive Phase 01 record, so the schema-level public/private boundary remains Phase 02 work.
- Admin and other deferred client surfaces can still write trusted entitlement fields until their scheduled security phases.

## Known security issues

- Previously exposed admin credentials and the Resend API key require external rotation.
- Public/private card fields are not separated; current cards RLS permits anonymous reads of every row.
- Client-controlled `plan_tier`, direct privileged browser operations, weak anonymous lead/analytics insertion, webhook SSRF, in-memory rate limiting, and custom admin tokens remain unresolved.

## Deferred work

- No schema, RLS, account, admin, billing, Wallet, analytics, lead, media, or UI redesign was performed in Phase 01.
- The dedicated Phase 01 integration card remains inactive after acceptance testing. No existing owner/coworker record was modified.
- No production database, deployment, push, or remote branch was changed.

## Next phase

Do not begin Phase 02. First complete architecture review of Phase 01 and, only after explicit approval, create one clean Phase 01 checkpoint commit.
