# JustTap V2 Security Baseline

This is a repository-level risk register, not a claim that production has been audited. It intentionally names credential classes and environment variables without recording secret values.

## Immediate credential actions

The following values existed as tracked source literals before Phase 00 and must be rotated in the external systems or deployment environment:

- the admin username/password/secret combination used by the custom admin endpoint;
- the Resend API key used for lead email delivery.

Phase 00 removes those values from the current working tree but does not rewrite Git history. Rotation is therefore mandatory even after the code change. The previously embedded Supabase anonymous client key is public by design and is not equivalent to a service-role secret; it was removed from tracked documentation/source to centralize configuration. Review Supabase logs and policies, and rotate it only if the project owner determines the public key or project configuration was misused. Never place a Supabase service-role key in client code.

## Risk register

| Concern                             | Status                                     | Evidence/current behavior                                                                          | Scheduled response                                                                                      |
| ----------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Hard-coded admin credentials        | Fixed in current tree; rotation unresolved | Phase 00 removed source defaults and requires server environment values.                           | Rotate `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SECRET_KEY`; replace custom auth in Phases 04-05. |
| Hard-coded Resend key               | Fixed in current tree; rotation unresolved | Phase 00 removed the literal and missing `RESEND_API_KEY` now fails closed.                        | Rotate the Resend key immediately; harden email delivery in Phase 11.                                   |
| Public/private card boundary        | Migration ready, not yet applied           | `20260811193000_phase02_cards_rls.sql` revokes anonymous table access and exposes active public cards only through an explicit-column RPC. | Apply and run the Phase 02 live RLS matrix with two test users.                                               |
| Client-controlled `plan_tier`       | Partially mitigated, still critical        | CardEditor, guest publishing, and Pro Demo Mode no longer write it; deferred admin/legacy surfaces can. | Remove all remaining client authority in Phases 02, 05, 06, and 08.                              |
| Broad anonymous lead insertion      | Unresolved                                 | Anonymous users can insert lead rows; current controls are application-level only.                 | Add policy constraints, validation, abuse controls, and retention in Phases 02 and 09.                  |
| Broad anonymous analytics insertion | Unresolved                                 | Anonymous users can insert arbitrary analytics events.                                             | Add trusted event contracts and abuse controls in Phases 02 and 10.                                     |
| Outbound webhook SSRF               | Unresolved, high                           | User-configured `http` URLs are fetched by server routes without destination restrictions.         | Validate protocols/hosts, block private networks, add signing and retries in Phase 11.                  |
| Rate limiting                       | Unresolved                                 | Current limiter is process memory and is not durable across Cloudflare isolates.                   | Implement edge/distributed controls in Phase 11.                                                        |
| Custom admin authentication         | Unresolved, critical                       | Credentials are compared by a custom endpoint and a reversible token is derived from admin values. | Replace with authenticated role checks and privileged server APIs in Phases 04-05.                      |
| Deactivated cards still render      | Fixed in authoritative public paths        | `/c/:slug`, vCard, and OG require `is_active = true`; inactive cards use the public 404 response.  | Add database-policy coverage in Phase 02 and end-to-end coverage in Phase 16.                           |
| Error conflation                    | Fixed in authoritative public paths        | Missing/inactive outcomes map to 404 while resolver failures map to controlled 5xx responses.      | Extend the same error discipline to deferred APIs in Phase 11.                                         |
| Mutable monolithic schema           | Unresolved                                 | `supabase/schema.sql` is the only schema history.                                                  | Introduce versioned migrations in Phase 02.                                                             |

## Environment boundary

Public browser configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only configuration:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET_KEY`
- `RESEND_API_KEY`

Server-only names must never be prefixed with `VITE_` or `NEXT_PUBLIC_`. Server code must not log their values, include them in responses, or silently fall back to embedded/demo credentials. Missing required admin or email secrets returns a service-configuration error instead of authenticating or simulating success.

## Operating rules

- Never commit `.env`, `.dev.vars`, production dumps, private keys, service-role keys, or third-party API keys.
- Treat anonymous Supabase access as untrusted even though its client key is public.
- Use least-privilege server access and explicit field projections.
- Do not bypass RLS to repair a client feature.
- Do not use clients as entitlement or administrative authorities.
- Rotate exposed credentials outside Git; deleting a literal from the latest tree is not rotation.
