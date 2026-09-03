import { supabase } from "../supabase";

export interface RequestRefundParams {
  idempotencyKey?: string;
  paymentId: string;
  amountMinor: number;
  reason?: string;
  adminNote?: string;
}

export interface RequestRefundResult {
  refund_id: string;
  payment_id: string;
  amount_minor: number;
  currency: string;
  type: "full" | "partial";
  status: string;
  remaining_refundable_minor: number;
  idempotent_replay?: boolean;
}

export async function adminRequestRefund(
  params: RequestRefundParams,
): Promise<{ data: RequestRefundResult | null; error: string | null }> {
  try {
    const key = params.idempotencyKey || crypto.randomUUID();

    const { data, error } = await supabase.rpc("admin_request_refund", {
      _idempotency_key: key,
      _payment_id: params.paymentId,
      _amount_minor: params.amountMinor,
      _reason: params.reason?.trim() || null,
      _admin_note: params.adminNote?.trim() || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as RequestRefundResult, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to request refund",
    };
  }
}
