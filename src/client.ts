import axios from 'axios';

// Types

type PaymentMethod = 'card' | 'mobile_money' | 'bank_transfer';

interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

interface ReevitCheckoutConfig {
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  method: string;
  country: string;
  customer_id?: string;
  metadata?: Record<string, unknown>;
  description?: string;
  policy?: {
    prefer?: string[];
    max_amount?: number;
    blocked_bins?: string[];
    allowed_bins?: string[];
    velocity_max_per_minute?: number;
  };
}

interface PaymentIntentResponse {
  id: string;
  connection_id: string;
  provider: string;
  status: string;
  client_secret: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string;
  net_amount: number;
}

interface ConfirmPaymentRequest {
  provider_ref_id: string;
  provider_data?: Record<string, unknown>;
}

interface PaymentDetailResponse {
  id: string;
  connection_id: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string;
  net_amount: number;
  customer_id?: string;
  client_secret: string;
  provider_ref_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface APIErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string>;
}

interface ReevitAPIClientConfig {
  publicKey: string;
  baseUrl?: string;
  timeout?: number;
}

// Constants

const API_BASE_URL_PRODUCTION = 'https://api.reevit.io';
const API_BASE_URL_SANDBOX = 'https://sandbox-api.reevit.io';
const DEFAULT_TIMEOUT = 30000;

function isSandboxKey(publicKey: string): boolean {
  return publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_sandbox_');
}

function createPaymentError(response: any, errorData: APIErrorResponse): PaymentError {
  return {
    code: errorData.code || 'api_error',
    message: errorData.message || 'An unexpected error occurred',
    details: {
      httpStatus: response.status,
      ...errorData.details,
    },
  };
}

export class ReevitAPIClient {
  private publicKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: ReevitAPIClientConfig) {
    this.publicKey = config.publicKey;
    this.baseUrl = config.baseUrl || (isSandboxKey(config.publicKey) ? API_BASE_URL_SANDBOX : API_BASE_URL_PRODUCTION);
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<{ data?: T; error?: PaymentError }> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`,
          'X-Reevit-Client': '@reevit/node',
          'X-Reevit-Client-Version': '0.3.0',
        },
        timeout: this.timeout,
      });
      return { data: response.data };
    } catch (error: any) {
      if (error.response) {
        return {
          error: createPaymentError(error.response, error.response.data),
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          error: {
            code: 'request_timeout',
            message: 'The request timed out. Please try again.',
          },
        };
      } else if (error.message.includes('Network Error') || error.code === 'ENOTFOUND') {
        return {
          error: {
            code: 'network_error',
            message: 'Unable to connect to Reevit. Please check your internet connection.',
          },
        };
      } else {
        return {
          error: {
            code: 'unknown_error',
            message: 'An unexpected error occurred. Please try again.',
          },
        };
      }
    }
  }

  async createPaymentIntent(config: ReevitCheckoutConfig, method: PaymentMethod, country = 'GH'): Promise<{ data?: PaymentIntentResponse; error?: PaymentError }> {
    const request: CreatePaymentIntentRequest = {
      amount: config.amount,
      currency: config.currency,
      method: this.mapPaymentMethod(method),
      country,
      customer_id: config.metadata?.customerId as string | undefined,
      metadata: config.metadata,
    };
    return this.request<PaymentIntentResponse>('POST', '/v1/payments/intents', request);
  }

  async getPaymentIntent(paymentId: string): Promise<{ data?: PaymentDetailResponse; error?: PaymentError }> {
    return this.request<PaymentDetailResponse>('GET', `/v1/payments/${paymentId}`);
  }

  async confirmPayment(paymentId: string): Promise<{ data?: PaymentDetailResponse; error?: PaymentError }> {
    return this.request<PaymentDetailResponse>('POST', `/v1/payments/${paymentId}/confirm`);
  }

  async cancelPaymentIntent(paymentId: string): Promise<{ data?: PaymentDetailResponse; error?: PaymentError }> {
    return this.request<PaymentDetailResponse>('POST', `/v1/payments/${paymentId}/cancel`);
  }

  private mapPaymentMethod(method: PaymentMethod): string {
    switch (method) {
      case 'card':
        return 'card';
      case 'mobile_money':
        return 'mobile_money';
      case 'bank_transfer':
        return 'bank_transfer';
      default:
        return method;
    }
  }
}

export function createReevitClient(config: ReevitAPIClientConfig): ReevitAPIClient {
  return new ReevitAPIClient(config);
}
