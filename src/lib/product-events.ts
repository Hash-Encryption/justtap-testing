import { supabase } from "./supabase";

export type ClientProductEventName =
  | "card_edit_started"
  | "profile_completed"
  | "feature_used"
  | "pro_feature_view"
  | "pro_preview_started"
  | "pro_preview_interaction"
  | "pro_preview_configured"
  | "pro_upgrade_clicked";

export type ProductEventSource = "dashboard" | "editor" | "pro_preview";

export interface ProductEventMetadata {
  plan_tier?: "free" | "trialing" | "pro" | "enterprise";
  previous_plan_tier?: "free" | "trialing" | "pro" | "enterprise";
  completion_state?: "started" | "partial" | "complete";
  card_state?: "draft" | "live" | "inactive";
  interaction?: string;
  cta?: string;
  entry_surface?: string;
}

export interface RecordProductEventParams {
  eventId?: string; // Retrying an action reuses the same eventId
  eventName: ClientProductEventName;
  cardId?: string;
  sessionId?: string;
  feature?: string;
  source: ProductEventSource;
  metadata?: ProductEventMetadata;
  releaseIdentifier?: string;
}

export const DEFAULT_PRODUCT_RELEASE_ID = "testing-phase2";

const CLIENT_EVENT_ALLOWLIST = new Set<ClientProductEventName>([
  "card_edit_started",
  "profile_completed",
  "feature_used",
  "pro_feature_view",
  "pro_preview_started",
  "pro_preview_interaction",
  "pro_preview_configured",
  "pro_upgrade_clicked",
]);

const CLIENT_SOURCE_ALLOWLIST = new Set<ProductEventSource>(["dashboard", "editor", "pro_preview"]);

export function validateEventMetadata(
  metadata: ProductEventMetadata | Record<string, unknown>,
): boolean {
  const allowedKeys = new Set([
    "plan_tier",
    "previous_plan_tier",
    "interaction",
    "completion_state",
    "cta",
    "entry_surface",
    "card_state",
  ]);

  for (const [key, value] of Object.entries(metadata)) {
    if (!allowedKeys.has(key)) return false;
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return false;
    if (value.length > 80) return false;

    if (key === "plan_tier" || key === "previous_plan_tier") {
      if (!["free", "trialing", "pro", "enterprise"].includes(value)) return false;
    }
    if (key === "completion_state") {
      if (!["started", "partial", "complete"].includes(value)) return false;
    }
    if (key === "card_state") {
      if (!["draft", "live", "inactive"].includes(value)) return false;
    }
    if (key === "interaction" || key === "cta" || key === "entry_surface") {
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(value)) return false;
    }
  }

  const serialized = JSON.stringify(metadata);
  if (new TextEncoder().encode(serialized).length > 1024) return false;

  return true;
}

/**
 * Authoritative client product event recording.
 * Privacy-safe, role-isolated, and deduplicated at database boundary via event_id.
 */
export async function recordProductEvent(
  params: RecordProductEventParams,
): Promise<{ success: boolean; eventId: string; error?: string }> {
  if (!CLIENT_EVENT_ALLOWLIST.has(params.eventName)) {
    return {
      success: false,
      eventId: params.eventId || "",
      error: `Event ${params.eventName} requires a trusted server or database producer`,
    };
  }

  if (!CLIENT_SOURCE_ALLOWLIST.has(params.source)) {
    return {
      success: false,
      eventId: params.eventId || "",
      error: `Invalid client event source: ${params.source}`,
    };
  }

  const eventId = params.eventId || crypto.randomUUID();

  const cleanMetadata: ProductEventMetadata = {};
  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      if (v !== undefined && v !== null) {
        cleanMetadata[k as keyof ProductEventMetadata] = v;
      }
    }
  }

  if (!validateEventMetadata(cleanMetadata)) {
    return { success: false, eventId, error: "Product event metadata is invalid" };
  }

  try {
    const { data, error } = await supabase.rpc("record_product_event", {
      _event_id: eventId,
      _event_name: params.eventName,
      _card_id: params.cardId || null,
      _session_id: params.sessionId || null,
      _feature: params.feature || null,
      _source: params.source,
      _metadata: cleanMetadata,
      _release_identifier: params.releaseIdentifier || DEFAULT_PRODUCT_RELEASE_ID,
    });

    if (error) {
      return { success: false, eventId, error: error.message };
    }

    return { success: Boolean(data), eventId };
  } catch (err: unknown) {
    return { success: false, eventId, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Real application trigger point producers
// ---------------------------------------------------------------------------

export function trackCardEditStarted(cardId?: string, isLive?: boolean, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "card_edit_started",
    cardId,
    source: "editor",
    metadata: {
      card_state: isLive ? "live" : "draft",
    },
  });
}

export function trackProfileCompleted(cardId?: string, isLive?: boolean, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "profile_completed",
    cardId,
    source: "editor",
    metadata: {
      completion_state: "complete",
      card_state: isLive ? "live" : "draft",
    },
  });
}

export function trackProFeatureView(feature: string, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "pro_feature_view",
    feature,
    source: "pro_preview",
    metadata: {
      entry_surface: "pro_features",
    },
  });
}

export function trackProPreviewStarted(entrySurface = "dashboard", eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "pro_preview_started",
    source: "pro_preview",
    metadata: {
      entry_surface: entrySurface.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
    },
  });
}

export function trackProPreviewInteraction(interaction: string, cta?: string, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "pro_preview_interaction",
    source: "pro_preview",
    metadata: {
      interaction: interaction.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
      cta: cta ? cta.replace(/[^a-z0-9_]/gi, "_").toLowerCase() : undefined,
    },
  });
}

export function trackProPreviewConfigured(feature: string, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "pro_preview_configured",
    feature,
    source: "pro_preview",
    metadata: {
      interaction: "feature_toggle",
    },
  });
}

export function trackFeatureUsed(feature: string, eventId?: string) {
  return recordProductEvent({
    eventId,
    eventName: "feature_used",
    feature,
    source: "dashboard",
  });
}
