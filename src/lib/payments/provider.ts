import type { PaymentPurpose, SafePaymentMethod } from "./types";

export interface PreparePaymentParams {
  userId: string;
  purpose: PaymentPurpose;
  amountMinor: number;
  currency: string;
  orderId?: string;
  subscriptionId?: string;
  offerId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderResult<T = unknown> {
  success: boolean;
  code?: string;
  error?: string;
  data?: T;
}

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;

  preparePayment(
    params: PreparePaymentParams,
  ): Promise<
    PaymentProviderResult<{ paymentId: string; clientSecret?: string; checkoutUrl?: string }>
  >;

  createPayment(params: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    paymentMethodToken?: string;
  }): Promise<
    PaymentProviderResult<{ providerPaymentId: string; status: string; isPaid: boolean }>
  >;

  fetchPayment(
    paymentId: string,
  ): Promise<
    PaymentProviderResult<{ providerPaymentId: string; status: string; amountMinor: number }>
  >;

  verifyPayment(
    paymentId: string,
    verificationToken?: string,
  ): Promise<PaymentProviderResult<{ isVerified: boolean; paidAt?: string }>>;

  refundPayment(
    paymentId: string,
    amountMinor: number,
    reason?: string,
  ): Promise<PaymentProviderResult<{ providerRefundId: string; status: string }>>;

  savePaymentMethod(
    userId: string,
    tokenData: Record<string, unknown>,
  ): Promise<PaymentProviderResult<SafePaymentMethod>>;
}
