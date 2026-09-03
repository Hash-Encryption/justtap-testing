import { supabase } from "../supabase";

export interface ReconciliationReport {
  diagnostic_timestamp: string;
  provider_reconciliation_status: string;
  unpaid_completed_orders: Array<{
    order_id: string;
    order_number: string;
    payment_status: string;
    fulfillment_status: string;
    created_at: string;
  }>;
  unassigned_completed_orders: Array<{
    order_id: string;
    order_number: string;
    fulfillment_status: string;
    created_at: string;
  }>;
  active_sub_unpaid_payments: Array<{
    subscription_id: string;
    user_id: string | null;
    plan_id: string;
    status: string;
  }>;
}

export async function adminGetReconciliation(): Promise<{
  data: ReconciliationReport | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_get_reconciliation");
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as ReconciliationReport, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load reconciliation report",
    };
  }
}
