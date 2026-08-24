import { supabase } from "./supabase";

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "vcard_download",
  "phone_click",
  "email_click",
  "whatsapp_click",
  "social_click",
  "website_click",
  "share",
  "booking_click",
  "custom_cta_click",
  "pdf_download",
  "video_play",
  "wallet_add",
  "connection_submit",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
export type AnalyticsEntrySource = "direct" | "profile_qr" | "permanent_tag";
export type AnalyticsMetadata = {
  referrer_host?: string;
  device_category?: "mobile" | "tablet" | "desktop";
};
export type AnalyticsEventContext = {
  eventId: string;
  sessionId: string | null;
  metadata: AnalyticsMetadata;
};

const SESSION_KEY = "justtap.analytics.session.v1";
export const ENTRY_SOURCE_QUERY_KEY = "jt_entry";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SessionStore = Pick<Storage, "getItem" | "setItem">;

export function getAnalyticsSessionId(
  store: SessionStore | null = typeof sessionStorage === "undefined" ? null : sessionStorage,
): string | null {
  if (!store) return null;

  try {
    const current = store.getItem(SESSION_KEY);
    if (current && UUID_PATTERN.test(current)) return current;

    const created = crypto.randomUUID();
    store.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function getPublicAnalyticsMetadata(
  referrer = typeof document === "undefined" ? "" : document.referrer,
  viewportWidth = typeof window === "undefined" ? undefined : window.innerWidth,
): AnalyticsMetadata {
  const metadata: AnalyticsMetadata = {};

  try {
    const host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
    if (host) metadata.referrer_host = host.slice(0, 253);
  } catch {
    // Invalid referrers are omitted rather than retained as raw visitor data.
  }

  if (typeof viewportWidth === "number" && Number.isFinite(viewportWidth)) {
    metadata.device_category =
      viewportWidth < 768 ? "mobile" : viewportWidth < 1024 ? "tablet" : "desktop";
  }

  return metadata;
}

export function createAnalyticsEventContext(): AnalyticsEventContext {
  return {
    eventId: crypto.randomUUID(),
    sessionId: getAnalyticsSessionId(),
    metadata: getPublicAnalyticsMetadata(),
  };
}

export function getPublicCardEntrySource(search: string): AnalyticsEntrySource {
  const source = new URLSearchParams(search).get(ENTRY_SOURCE_QUERY_KEY);
  return source === "profile_qr" || source === "permanent_tag" ? source : "direct";
}

export async function trackPublicCardEvent(
  cardSlug: string,
  eventType: AnalyticsEventType,
  context = createAnalyticsEventContext(),
): Promise<boolean> {
  const { data, error } = await supabase.rpc("record_public_card_event", {
    _card_slug: cardSlug,
    _event_type: eventType,
    _event_id: context.eventId,
    _session_id: context.sessionId,
    _metadata: context.metadata,
  });

  return !error && data !== null;
}

export async function trackProfileQrPageView(
  cardSlug: string,
  context = createAnalyticsEventContext(),
): Promise<boolean> {
  const { data, error } = await supabase.rpc("record_public_profile_qr_page_view", {
    _card_slug: cardSlug,
    _event_id: context.eventId,
    _session_id: context.sessionId,
    _metadata: context.metadata,
  });

  return !error && data !== null;
}
