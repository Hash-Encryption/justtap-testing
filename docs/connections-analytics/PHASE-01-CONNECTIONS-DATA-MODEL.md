# Phase 01 — Connections Data Model

Date: 2026-08-15

## Migration

`20260815010000_connections_data_model.sql` reconciles the existing `card_leads` table in place. Its preflight fails closed if legacy rows have missing ownership/timestamps or violate the new visitor-field limits. It does not recreate the table or rewrite existing Connection data.

The model now includes visitor email, company, job title, the existing visitor `note`, private `owner_note`, constrained status (`new`, `follow_up`, `contacted`, `done`), private text-array tags, and `updated_at`. Field lengths, email/phone formats, status, tag count, and tag length are enforced by database constraints. The existing card index is retained; `(card_id, status, created_at desc)` supports owner status filtering.

## Security boundary

Anonymous and authenticated direct inserts are revoked. Public capture uses `create_public_connection`, a fixed-search-path `SECURITY DEFINER` RPC that accepts only visitor fields, resolves a validated slug to an active card, and inserts no private management values.

Authenticated owners can read/delete Connections belonging to their cards and cannot see another owner's rows. Only database-entitled Pro/enterprise owners (or existing administrators) can update `owner_note`, `status`, and `tags`; column grants prevent those callers from rewriting visitor fields. Anonymous callers cannot read, update, delete, set private fields, or choose an arbitrary card UUID.

## Application contract

The shared public `CardView` submits through the RPC and supports required name/phone plus optional email, company, job title, and visitor note. Zod validation mirrors the database limits and rejects unknown privileged fields. The existing email notification call remains compatible and was not redesigned.

## Focused validation

- Migration ledger and dry run matched the approved project `nlumgigqlaymjiwgpvtp`; the migration applied cleanly.
- A synthetic two-user live matrix passed owner reads, mutual cross-user isolation, anonymous denial, active/inactive card behavior, public/private field separation, Free management denial, and Pro management updates.
- Synthetic users and dependent rows were deleted after the matrix.
- Focused validator/CardView tests, V2 typecheck, changed-file lint, and `git diff --check` passed.

## Deferred

Durable anti-abuse/rate limiting, final Connections management UI, export entitlement UX, custom forms, analytics, email/webhook hardening, retries, and retention policy remain in their assigned later phases.
