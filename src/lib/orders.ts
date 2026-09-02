import { supabase } from "./supabase";

export interface CardOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  card_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  card_name_snapshot: string;
  card_slug_snapshot: string;
  digital_card_token_snapshot: string;
  product_id: string | null;
  product_name: string;
  product_variant: string;
  sku: string;
  quantity: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  city: string;
  postal_code: string | null;
  delivery_instructions: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  fulfillment_status: "new" | "preparing" | "ready" | "shipped" | "completed" | "cancelled";
  payment_provider: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  refund_reference: string | null;
  refunded_at: string | null;
  nfc_tag_id: string | null;
  nfc_token_snapshot: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  completed_at: string | null;
}

export interface CardOrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  actor_type: "customer" | "admin" | "system";
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateOrderParams {
  cardId: string;
  productId: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  city: string;
  postalCode?: string;
  deliveryInstructions?: string;
}

export async function getUserOrders(): Promise<{ data: CardOrder[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("card_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CardOrder[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load orders" };
  }
}

export async function getOrderEvents(
  orderId: string,
): Promise<{ data: CardOrderEvent[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("card_order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CardOrderEvent[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load order timeline",
    };
  }
}

export async function createPhysicalCardOrder(
  params: CreateOrderParams,
): Promise<{ data: { order_id: string; order_number: string } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("create_physical_card_order", {
      _card_id: params.cardId,
      _product_id: params.productId,
      _recipient_name: params.recipientName,
      _recipient_phone: params.recipientPhone,
      _shipping_address: params.shippingAddress,
      _city: params.city,
      _postal_code: params.postalCode || null,
      _delivery_instructions: params.deliveryInstructions || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as { order_id: string; order_number: string }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to place order" };
  }
}
