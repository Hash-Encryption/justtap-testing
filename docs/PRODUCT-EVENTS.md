# Product Events Architecture & Telemetry Contract

Last updated: 2026-08-30

## 1. Overview & Purpose

The `product_events` subsystem provides privacy-safe, role-isolated, and deduplicated telemetry for JustTap internal product analytics. It measures application activation, user journey progressions, feature engagement, and Pro preview interest.

### Core Non-Negotiable Rules

1. **Product events never control authority:** Events are purely observational. They never control permissions, subscription state, billing entitlement, or feature gating.
2. **Strict separation from public visitor analytics:** Public card views, QR scans, contact downloads, and lead form interactions belong to `public.card_analytics` and `public.connections`. They are never counted as owner product activity.
3. **Privacy first:** Connection messages, visitor notes, owner notes, phone numbers, and credentials are never accepted or logged into product events.
4. **Append-only integrity:** Product events are immutable once written. Clients have zero `SELECT`, `UPDATE`, or `DELETE` permissions on `public.product_events`.

---

## 2. Event Producers

Events originate from two trusted boundaries:

### A. Authoritative Database Triggers (System Events)

| Event Name | Source Boundary | Trigger Condition |
| :--- | :--- | :--- |
| `signup_completed` | Database Trigger | Fired when a new user profile is created. |
| `card_created` | Database Trigger | Fired when a new card row is inserted into `public.cards`. |
| `card_published` | Database Trigger | Fired when `cards.is_active` transitions from `false` to `true` (and sets `published_at`). |
| `trial_started` | Database Trigger | Fired when `profiles.plan_tier` transitions to `'trialing'`. |
| `entitlement_changed` | Database Trigger | Fired when `profiles.plan_tier` is modified. |

Client calls attempting to emit these event names are strictly rejected by the database RPC.

### B. Client-Side User Interactions (`record_product_event` RPC)

Client events are recorded via `src/lib/product-events.ts`:

| Event Name | Allowed Source | Description & Metadata |
| :--- | :--- | :--- |
| `card_edit_started` | `editor` | User enters the card editor. Metadata: `card_state: "live" \| "draft"`. |
| `profile_completed` | `editor` | User successfully saves/publishes card changes. Metadata: `completion_state: "complete"`. |
| `pro_feature_view` | `pro_preview` | User views the Pro Features tab. Metadata: `entry_surface: "pro_features"`. |
| `pro_preview_started` | `pro_preview` | Unentitled user encounters a Pro preview surface. Metadata: `entry_surface: "pro_features"`. |
| `pro_preview_interaction` | `pro_preview` | User interacts with a preview element. E.g. Trial CTA: `interaction: "trial_cta_click"`, `cta: "start_trial"`. |
| `pro_preview_configured` | `pro_preview` | User configures preview settings. E.g. `interaction: "feature_toggle"`. |
| `feature_used` | `dashboard` | User uses a core tool (e.g. `feature: "qr_export"`). |
| `pro_upgrade_clicked` | `pro_preview` | Reserved strictly for real paid upgrade CTAs. (Currently inactive in testing because the primary CTA is trial start, not paid checkout). |

> [!IMPORTANT]
> **Trial CTA Semantics:** The 7-day trial start button emits `pro_preview_interaction` with metadata `{ cta: "start_trial" }`. It must **NEVER** emit `pro_upgrade_clicked`. Authoritative `trial_started` is recorded by the database trigger upon entitlement update.

---

## 3. Deduplication & Idempotency

* **Primary Key:** Every record has an `event_id` (UUID).
* **Distinct Actions:** Each separate user interaction generates a fresh `crypto.randomUUID()`.
* **Retries:** When a client retries a failed or transient request, it passes the existing `eventId`. The database enforces `ON CONFLICT (event_id) DO NOTHING`.
* No client memory cache is used to suppress distinct legitimate user actions.

---

## 4. Metadata Schema & Payload Constraints

The database function `record_product_event` validates all metadata payloads with strict constraints:

1. **Allowlisted Keys Only:**
   - `plan_tier` (`'free'`, `'trialing'`, `'pro'`, `'enterprise'`)
   - `previous_plan_tier` (`'free'`, `'trialing'`, `'pro'`, `'enterprise'`)
   - `completion_state` (`'started'`, `'partial'`, `'complete'`)
   - `card_state` (`'draft'`, `'live'`, `'inactive'`)
   - `interaction` (regex: `^[a-z][a-z0-9_]{1,63}$`)
   - `cta` (regex: `^[a-z][a-z0-9_]{1,63}$`)
   - `entry_surface` (regex: `^[a-z][a-z0-9_]{1,63}$`)

2. **Length & Size Limits:**
   - Individual string values cannot exceed 80 characters.
   - Total serialized metadata JSON cannot exceed 1024 bytes.
   - Any unknown keys or oversized payloads fail validation immediately.

---

## 5. Consumers & Reporting

Product events are consumed exclusively by privileged administrators via the `/admin` portal:

1. **Active Users (DAU / WAU / MAU):** Distinct authenticated user counts active over 1-day, 7-day, and 30-day windows.
2. **Product Funnel / Stage View:**
   - Forward-tracked stages: Account Created (`signup_completed`), Card Created (`card_created`), Card Published (`card_published`), Trial Started (`trial_started`).
   - Unavailable stages: Checkout Started & Paid Upgrade are explicitly labeled: `Unavailable — checkout and paid billing flows are not implemented in testing.`
3. **User Support Detail:** Shows recent product event history for an individual user profile during support investigations.

---

## 6. Retention Policy

> [!NOTE]
> **Retention Policy Status:** No automated retention pruning period has been approved. Product events remain in an append-only log. Events must not be silently purged or deleted without explicit operator instruction and versioned migration.
