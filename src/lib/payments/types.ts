export type PlanTier = "free" | "trialing" | "pro" | "enterprise";

export type BillingInterval = "month" | "year" | "one_time";

export type SubscriptionStatus =
  "pending" | "trialing" | "active" | "past_due" | "cancelled" | "expired";

export type PaymentPurpose =
  | "subscription_initial"
  | "subscription_renewal"
  | "subscription_upgrade"
  | "physical_card_order"
  | "pro_nfc_bundle";

export type PaymentStatus =
  | "created"
  | "initiated"
  | "requires_action"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "partially_refunded"
  | "refunded";

export type RefundType = "full" | "partial";

export type RefundStatus = "requested" | "processing" | "succeeded" | "failed";

export type PaymentMethodStatus = "active" | "revoked" | "expired";

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  card_limit: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingPrice {
  id: string;
  plan_id: string;
  amount_minor: number;
  currency: string;
  billing_interval: BillingInterval;
  billing_interval_count: number;
  is_active: boolean;
  is_self_service: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingOffer {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  amount_minor: number;
  currency: string;
  included_plan_id: string;
  included_price_id: string;
  included_physical_product_id: string;
  included_physical_quantity: number;
  initial_subscription_duration_days: number;
  renewal_price_id: string;
  savings_amount_minor: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SafePaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last_four: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  status: PaymentMethodStatus;
  is_default: boolean;
  created_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string | null;
  plan_id: string;
  plan_name?: string;
  price_id: string;
  originating_offer_id: string | null;
  provider: string | null;
  provider_customer_reference: string | null;
  provider_subscription_reference: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  past_due_since: string | null;
  grace_ends_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  default_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  idempotency_key?: string | null;
  user_id: string | null;
  purpose: PaymentPurpose;
  subscription_id: string | null;
  order_id: string | null;
  order_number?: string | null;
  offer_id: string | null;
  amount_minor: number;
  currency: string;
  provider: string | null;
  provider_payment_id: string | null;
  provider_status: string | null;
  status: PaymentStatus;
  payment_method_id?: string | null;
  payment_method_snapshot?: Record<string, unknown> | null;
  failure_code: string | null;
  failure_message: string | null;
  initiated_at: string | null;
  authorized_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  metadata: Record<string, unknown>;
  is_test: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PaymentRefundRecord {
  id: string;
  idempotency_key?: string | null;
  payment_id: string;
  amount_minor: number;
  currency: string;
  type: RefundType;
  reason: string | null;
  admin_note: string | null;
  provider_refund_id: string | null;
  status: RefundStatus;
  requested_by: string | null;
  requested_at: string;
  processed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBillingOverview {
  plan_tier: PlanTier;
  is_trial_active: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number;
  card_count: number;
  card_limit: number;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    plan_id: string;
    plan_name: string;
    amount_minor: number;
    currency: string;
    current_period_start: string | null;
    current_period_end: string | null;
    next_charge_at: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
  } | null;
}

export interface CommercialCatalogData {
  plans: BillingPlan[];
  prices: BillingPrice[];
  offers: BillingOffer[];
  products: Array<{
    id: string;
    name: string;
    name_ar: string;
    variant: string;
    variant_ar: string;
    sku: string;
    price: number;
    currency: string;
    is_active: boolean;
  }>;
}

export interface AdminBillingOverviewData {
  total_payments: number;
  pending_payments: number;
  paid_payments: number;
  failed_payments: number;
  partially_refunded: number;
  refunded: number;
  paid_revenue_minor: number;
  currency: string;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  cancelled_subscriptions: number;
  reconciliation_issues: number;
}

export interface AdminPaymentRow extends PaymentRecord {
  customer_name?: string | null;
  customer_email?: string | null;
  order_number?: string | null;
}

export interface AdminSubscriptionRow extends SubscriptionRecord {
  customer_name?: string | null;
  customer_email?: string | null;
}

export interface PaymentDetailData {
  payment: PaymentRecord & { remaining_refundable_minor: number };
  customer?: {
    user_id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    plan_tier: string;
  } | null;
  order?: {
    id: string;
    order_number: string;
    product_variant: string;
    fulfillment_status: string;
    nfc_token: string | null;
  } | null;
  subscription?: {
    id: string;
    plan_id: string;
    status: string;
    current_period_end: string | null;
  } | null;
  refunds?: PaymentRefundRecord[];
  events?: Array<{
    id: string;
    event_type: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
}
