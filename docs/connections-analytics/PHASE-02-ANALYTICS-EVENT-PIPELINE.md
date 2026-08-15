# Phase 02 — Analytics Event Pipeline

## Contract

Public analytics now enters through `record_public_card_event`. The RPC accepts a public card slug, a canonical event name, a random event UUID, an optional random session UUID, and constrained metadata. It derives the internal card ID only from an active public card and returns only whether the event was newly inserted. Anonymous and authenticated clients cannot insert directly into `card_analytics`.

Canonical events are `page_view`, `vcard_download`, `phone_click`, `email_click`, `whatsapp_click`, `social_click`, `website_click`, `share`, `booking_click`, `custom_cta_click`, `pdf_download`, `video_play`, `wallet_add`, and `connection_submit`. Phase 02 emits only `page_view` and `vcard_download`; the other names reserve the validated vocabulary for later authorized emitters.

## Identity, metadata, and privacy

- `event_id` is a client-generated UUID unique per card. Retrying the same card/event ID is a successful no-op; a new user action receives a new ID.
- `session_id` is an optional random UUID kept in `sessionStorage`, so it is scoped to one browser tab session and disappears when that tab session ends. It is not a person or account identifier.
- Metadata accepts only `referrer_host` (never the path or query) and a coarse `mobile`, `tablet`, or `desktop` viewport category. It is explicitly untrusted public context.
- The new path does not collect IP addresses, fingerprints, precise location, raw user-agent strings, cross-site identifiers, or personal visitor fields. The old nullable `user_agent` column remains only to preserve history.

## Storage and security

Migration `20260815020000_analytics_event_pipeline.sql` preserves existing rows, adds nullable event/session IDs for legacy compatibility, constrained JSON metadata, an event allowlist, idempotency uniqueness, and card/date plus card/event/date indexes. Existing owner/admin read and delete RLS remains in place. Direct anonymous reads/writes and authenticated inserts/updates are denied; the narrow RPC is the only public ingestion path.

`CardView` records `page_view` best-effort through the shared helper. Save Contact carries its event/session context to the existing vCard route, which records `vcard_download` through the same RPC. Analytics failure never changes public-card or vCard success behavior, and the former direct insert paths are removed to prevent double writes.

## Deferred

Phase 03 owns NFC/QR source attribution and will preserve permanent `/t/$token`, mutable `/c/$slug`, and all three QR products. Final aggregation, ranges, KPIs, charts, funnels, source reporting, and the newest-500 UI limitation remain Phase 05. Later emitters may use only the reserved taxonomy and shared helper; adding new metadata requires a reviewed database contract change.
