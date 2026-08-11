# Phase 01 Manual Acceptance

Use a safe Supabase environment with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured. Start the already-built application once with `npm run dev`. Do not rebuild or redeploy between the data changes and URL checks below.

## Executed integration result - 2026-08-11

The full matrix below passed against the authorized JustTap Supabase project using only the public/anon client and normal authenticated RLS paths. A dedicated account inserted `phase01-live-778e8350` through CardEditor while one Vite runtime remained running; the new public URL rendered immediately without a rebuild or restart. CardEditor then updated it to `phase01-updated-778e8350`; the new URL rendered and the old URL returned 404. A duplicate update produced `This URL is already taken.` and, after a Phase 01 fix, kept `View live` anchored to the persisted test slug instead of the rejected duplicate. The dedicated record was finally deactivated through its owning authenticated anon client and returned public 404. An isolated second runtime with an unavailable Supabase endpoint returned a controlled 500 service page and logged a credential-free diagnostic.

The direct anonymous table query could still select the inactive row. Public routes remain protected by the resolver's active filter, but the broader table RLS/public-private boundary is deferred to Phase 02 as documented in `SECURITY.md`.

## Existing card

1. Identify an active card with a valid normalized slug.
2. Visit `/c/existing-slug`.
3. Confirm the card renders and the response is successful.

## Missing card

1. Visit `/c/definitely-not-real`.
2. Confirm the controlled public not-found page renders.

## Inactive card

1. Set a test card's `is_active` value to `false` through an authorized test workflow.
2. Visit its `/c/inactive-card` URL.
3. Confirm it uses the same public not-found response and does not render card data.

## Newly created card without rebuild

1. Keep the application server running.
2. Create a normal card record with a unique valid slug such as `phase-one-new-card` and `is_active = true`.
3. Immediately visit `/c/phase-one-new-card`.
4. Confirm it renders without rebuilding or restarting the application.

## Changed slug

1. Start with an active test card at `/c/old-card`.
2. Change its slug to `new-card` and save.
3. Confirm `/c/new-card` works immediately.
4. Confirm `/c/old-card` returns the controlled not-found response.

## Service failure

1. In a safe local environment, temporarily point the application at an unavailable Supabase endpoint.
2. Visit a valid `/c/:slug` path.
3. Confirm the controlled service-unavailable page appears rather than the card-not-found page.
4. Confirm server logs contain a diagnostic without leaking credentials to the browser.
