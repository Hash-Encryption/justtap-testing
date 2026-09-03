import { supabase } from "../supabase";
import type { SafePaymentMethod, SubscriptionRecord, UserBillingOverview } from "./types";

export async function getUserBillingOverview(): Promise<{
  data: UserBillingOverview | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_user_billing_overview");
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as UserBillingOverview, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load billing overview",
    };
  }
}

export async function getUserPaymentMethods(): Promise<{
  data: SafePaymentMethod[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_user_payment_methods");
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as SafePaymentMethod[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load payment methods",
    };
  }
}

export async function adminGetSubscriptions(
  search?: string,
  status?: string,
): Promise<{ data: SubscriptionRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_get_subscriptions", {
      _search: search?.trim() || null,
      _status: status || "all",
    });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as SubscriptionRecord[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load subscriptions",
    };
  }
}
