import type { PaymentProvider, PaymentProviderResult, PreparePaymentParams } from "./provider";
import type { SafePaymentMethod } from "./types";

export const ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED = "PAYMENT_PROVIDER_NOT_CONFIGURED";

/**
 * DisabledPaymentProvider
 *
 * Safe provider implementation used when no live payment processor is connected.
 * Returns controlled domain errors without crashing and without faking success.
 */
export class DisabledPaymentProvider implements PaymentProvider {
  name = "disabled";

  isConfigured(): boolean {
    return false;
  }

  async preparePayment(
    _params: PreparePaymentParams,
  ): Promise<
    PaymentProviderResult<{ paymentId: string; clientSecret?: string; checkoutUrl?: string }>
  > {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }

  async createPayment(_params: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    paymentMethodToken?: string;
  }): Promise<
    PaymentProviderResult<{ providerPaymentId: string; status: string; isPaid: boolean }>
  > {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }

  async fetchPayment(
    _paymentId: string,
  ): Promise<
    PaymentProviderResult<{ providerPaymentId: string; status: string; amountMinor: number }>
  > {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }

  async verifyPayment(
    _paymentId: string,
    _verificationToken?: string,
  ): Promise<PaymentProviderResult<{ isVerified: boolean; paidAt?: string }>> {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }

  async refundPayment(
    _paymentId: string,
    _amountMinor: number,
    _reason?: string,
  ): Promise<PaymentProviderResult<{ providerRefundId: string; status: string }>> {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }

  async savePaymentMethod(
    _userId: string,
    _tokenData: Record<string, unknown>,
  ): Promise<PaymentProviderResult<SafePaymentMethod>> {
    return {
      success: false,
      code: "PROVIDER_DISABLED",
      error: ERROR_PAYMENT_PROVIDER_NOT_CONFIGURED,
    };
  }
}

export const defaultPaymentProvider = new DisabledPaymentProvider();
