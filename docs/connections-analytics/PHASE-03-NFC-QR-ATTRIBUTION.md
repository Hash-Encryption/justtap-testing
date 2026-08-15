# Phase 03 — NFC / QR Attribution

## Canonical entry sources

`card_analytics.entry_source` is populated only for new `page_view` rows:

- `direct`: `/c/$slug` opened without a JustTap entry marker. This means direct or otherwise unknown web entry, not certainty about manual URL entry.
- `profile_qr`: `/c/$slug?jt_entry=profile_qr`, encoded only by JustTap's Dynamic Profile QR generator.
- `permanent_tag`: a valid active `/t/$token` resolved server-side before redirecting to the card's current slug.

Null is preserved for pre-Phase-03 history and for non-entry events. No historical row is rewritten.

## Trust and event semantics

The public `record_public_card_event` signature is unchanged and accepts no source string. It records ordinary page views as `direct`. Profile QR uses a separate fixed-purpose RPC; the controlled URL marker indicates use of the generated QR destination but is not claimed as cryptographic proof of a camera scan. Permanent-tag attribution uses a separate fixed-purpose RPC that requires an existing active token assigned to an active card. It never accepts a card UUID, slug, or source value.

The tag route records one `page_view` before redirecting with a one-time marker that prevents the card renderer from adding a second page view. The marker is removed from the visible URL. Attribution is entry-only and is not propagated to later events in the tab session. Existing UUID retry deduplication remains authoritative. No `nfc_scan`, `qr_scan`, or other synthetic event exists.

## NFC and QR boundaries

Physical NFC and Permanent Tag QR both open `/t/$token`, so both are honestly reported as `permanent_tag`; they cannot be distinguished. The token remains immutable and the resolver still follows the card's mutable current slug. Inactive, revoked, unassigned, unknown, and malformed tokens remain indistinguishable public misses.

Dynamic Profile QR remains a web QR for `/c/$slug` with its narrow marker. Offline vCard QR still embeds `buildVCard(card)` directly and makes no JustTap request, so offline scans produce no web analytics.

## Migration and privacy

Migration `20260815030000_nfc_qr_attribution.sql` adds the nullable constrained column and fixed-purpose RPCs without rewriting historical events or changing NFC inventory, RLS, ownership, entitlements, authentication, or direct table grants. Attribution adds no IP address, fingerprint, precise location, durable visitor identifier, raw user agent, or cross-session identity.

## Focused validation

Focused unit contracts cover source constraints, tag-route recording and redirect behavior, retry deduplication, source spoofing boundaries, and separation of dynamic, permanent-tag, and offline vCard QR products. One disposable live acceptance run on `nlumgigqlaymjiwgpvtp` confirmed all three sources, invalid-source rejection, anonymous/authenticated direct-table denial, owner isolation, inactive/revoked behavior, immutable-token slug rename behavior, retry deduplication, synthetic-data cleanup, and unchanged historical analytics row count. The local/remote migration ledger matched afterward with zero pending migrations.
