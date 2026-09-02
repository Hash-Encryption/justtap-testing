import { supabase } from "./supabase";

export const DEFAULT_RELEASE_IDENTIFIER = "testing-phase2";

export interface OperationsOverview {
  total_users: number;
  new_users: number;
  activated_users: number;
  live_cards: number;
  inactive_cards: number;
  connections: number;
  trials_ending_soon: number;
  tier_distribution: Record<string, number>;
}

export interface AdminUserRow {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  plan_tier: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  card_count: number;
  live_card_count: number;
  inactive_card_count: number;
  connections_count: number;
  activated: boolean;
}

export interface AdminCardRow {
  id: string;
  user_id: string | null;
  slug: string;
  full_name: string;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  is_active: boolean;
  enable_arabic: boolean;
  plan_tier: string;
  owner_name: string | null;
  owner_email: string | null;
  connections_count: number;
  views: number;
  contact_saves: number;
  active_nfc_token: string | null;
}

export interface ProductAnalyticsSummary {
  collection_started: string | null;
  events: Record<string, number>;
  dau: number;
  wau: number;
  mau: number;
  recent: Array<{
    id: string;
    event_name: string;
    user_id: string | null;
    card_id: string | null;
    feature: string | null;
    source: string;
    created_at: string;
  }>;
}

export interface AdminAuditRow {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  result: "success" | "rejected" | "failed";
  change_summary: Record<string, unknown>;
  environment: string;
  release_identifier: string | null;
  created_at: string;
}

export interface OperationsData {
  overview: OperationsOverview;
  users: AdminUserRow[];
  cards: AdminCardRow[];
  product_analytics: ProductAnalyticsSummary;
  audit: AdminAuditRow[];
}

export interface UserDetailData {
  profile: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string;
    plan_tier: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    trial_used: boolean;
  };
  cards: Array<{
    id: string;
    slug: string;
    full_name: string;
    created_at: string;
    updated_at: string | null;
    published_at: string | null;
    is_active: boolean;
    enable_arabic: boolean;
    plan_tier: string;
  }>;
  connections_count: number;
  product_activity: Array<{
    event_name: string;
    feature: string | null;
    source: string;
    created_at: string;
  }>;
  audit: Array<{
    id: string;
    actor_user_id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    result: string;
    change_summary: Record<string, unknown>;
    created_at: string;
  }>;
}

export function maskNfcToken(token: string | null | undefined): string {
  if (!token) return "-";
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

export async function getOperations(params?: {
  rangeStart?: string;
  rangeEnd?: string;
  search?: string;
}): Promise<{ data: OperationsData | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_get_operations", {
      _range_start: params?.rangeStart || new Date(Date.now() - 30 * 86400000).toISOString(),
      _range_end: params?.rangeEnd || new Date().toISOString(),
      _search: params?.search?.trim() || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as OperationsData, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error).message || "Failed to load operations data" };
  }
}

export async function getUserDetail(
  userId: string,
): Promise<{ data: UserDetailData | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_get_user_detail", {
      _user_id: userId,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as UserDetailData, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error).message || "Failed to load user detail" };
  }
}

export async function adminCreateProfile(params: {
  fullName: string;
  email: string;
  phone?: string;
  planTier?: string;
  releaseId?: string;
}): Promise<{ data: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_create_profile", {
      _full_name: params.fullName.trim(),
      _email: params.email.trim().toLowerCase(),
      _phone: params.phone?.trim() || null,
      _plan_tier: params.planTier || "free",
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { data: null, error: error.message };
    return { data: data as string, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error).message || "Failed to create profile" };
  }
}

export async function adminCreateCard(params: {
  userId: string;
  slug: string;
  fullName: string;
  phone: string;
  isActive?: boolean;
  releaseId?: string;
}): Promise<{ data: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_create_card", {
      _user_id: params.userId,
      _slug: params.slug.trim().toLowerCase(),
      _full_name: params.fullName.trim(),
      _phone: params.phone.trim() || "-",
      _is_active: params.isActive ?? false,
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { data: null, error: error.message };
    return { data: data as string, error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error).message || "Failed to create card" };
  }
}

export async function adminSetEntitlement(params: {
  userId: string;
  planTier: string;
  reason: string;
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_set_entitlement", {
      _user_id: params.userId,
      _plan_tier: params.planTier,
      _reason: params.reason.trim(),
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to update entitlement" };
  }
}

export async function adminSetCardActive(params: {
  cardId: string;
  isActive: boolean;
  reason: string;
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_set_card_active", {
      _card_id: params.cardId,
      _is_active: params.isActive,
      _reason: params.reason.trim(),
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to update card status" };
  }
}

export async function adminDeleteCard(params: {
  cardId: string;
  confirmationSlug: string;
  reason: string;
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_delete_card", {
      _card_id: params.cardId,
      _confirmation_slug: params.confirmationSlug.trim().toLowerCase(),
      _reason: params.reason.trim(),
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to delete card" };
  }
}

export async function adminDeleteProfile(params: {
  profileId: string;
  confirmationEmail: string;
  reason: string;
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_delete_profile", {
      _profile_id: params.profileId,
      _confirmation_email: params.confirmationEmail.trim().toLowerCase(),
      _reason: params.reason.trim(),
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to delete profile" };
  }
}

export async function adminProvisionNfcTag(params?: {
  cardId?: string;
  releaseId?: string;
}): Promise<{
  data: {
    id: string;
    token: string;
    card_id: string | null;
    status: string;
    created_at: string;
    assigned_at: string | null;
  } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_provision_nfc_tag_audited", {
      _card_id: params?.cardId || null,
      _release_identifier: params?.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { data: null, error: error.message };
    return {
      data: data as {
        id: string;
        token: string;
        card_id: string | null;
        status: string;
        created_at: string;
        assigned_at: string | null;
      },
      error: null,
    };
  } catch (err: unknown) {
    return { data: null, error: (err as Error).message || "Failed to provision NFC tag" };
  }
}

export async function adminAssignNfcTag(params: {
  token: string;
  cardId: string;
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_assign_nfc_tag_audited", {
      _token: params.token.trim(),
      _card_id: params.cardId,
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to assign NFC tag" };
  }
}

export async function adminUpdateTagStatus(params: {
  token: string;
  status: "active" | "inactive" | "revoked";
  releaseId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("admin_update_tag_status_audited", {
      _token: params.token.trim(),
      _status: params.status,
      _release_identifier: params.releaseId || DEFAULT_RELEASE_IDENTIFIER,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to update tag status" };
  }
}
