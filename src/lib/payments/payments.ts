import { supabase } from "../supabase";
import type { AdminBillingOverviewData, PaymentRecord, PaymentDetailData } from "./types";

export interface CreateBundleCheckoutParams {
  idempotencyKey?: string;
  cardId: string;
  recipientName: string;
  recipientPhone: string;
  nationalAddress: string;
  city: string;
  postalCode?: string;
  deliveryInstructions?: string;
  shippingAddress?: string;
}

export interface BundleCheckoutResult {
  order_id: string;
  order_number: string;
  subscription_id: string;
  payment_id: string;
  amount_minor: number;
  currency: string;
  status: string;
  idempotent_replay?: boolean;
}

export async function getUserBillingHistory(): Promise<{
  data: PaymentRecord[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_user_billing_history");
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as PaymentRecord[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load billing history",
    };
  }
}

export async function createBundleCheckoutIntent(
  params: CreateBundleCheckoutParams,
): Promise<{ data: BundleCheckoutResult | null; error: string | null }> {
  try {
    const address = (params.nationalAddress || params.shippingAddress || "").trim();
    const key = params.idempotencyKey || crypto.randomUUID();

    const { data, error } = await supabase.rpc("create_bundle_order_and_subscription", {
      _idempotency_key: key,
      _card_id: params.cardId,
      _recipient_name: params.recipientName.trim(),
      _recipient_phone: params.recipientPhone.trim(),
      _national_address: address,
      _city: params.city.trim(),
      _postal_code: params.postalCode?.trim() || null,
      _delivery_instructions: params.deliveryInstructions?.trim() || null,
      _shipping_address: address,
    });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as BundleCheckoutResult, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create bundle checkout",
    };
  }
}

export async function adminGetBillingOverview(): Promise<{
  data: AdminBillingOverviewData | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_get_billing_overview");
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as AdminBillingOverviewData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load admin billing overview",
    };
  }
}

export async function adminGetPayments(
  search?: string,
  status?: string,
  purpose?: string,
): Promise<{ data: PaymentRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("admin_get_payments", {
      _search: search?.trim() || null,
      _status: status || "all",
      _purpose: purpose || "all",
    });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as PaymentRecord[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load payments",
    };
  }
}

export async function adminGetPaymentDetail(paymentId: string): Promise<{
  data: PaymentDetailData | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_get_payment_detail", {
      _payment_id: paymentId,
    });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as PaymentDetailData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load payment detail",
    };
  }
}
