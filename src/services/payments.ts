import { AxiosInstance } from 'axios';
import {
  Payment,
  PaymentIntentResponse,
  PaymentIntentRequest,
  PaymentStats,
  PaymentSummary,
  RequestOptions,
  Refund
} from '../types';
import { toRequestConfig } from './utils';

export class PaymentsService {
  constructor(private client: AxiosInstance) { }

  async createIntent(data: PaymentIntentRequest, requestOptions?: RequestOptions): Promise<PaymentIntentResponse> {
    const response = await this.client.post<PaymentIntentResponse>(
      '/v1/payments/intents',
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async list(limit: number = 50, offset: number = 0): Promise<PaymentSummary[]> {
    const response = await this.client.get<PaymentSummary[]>('/v1/payments', {
      params: { limit, offset }
    });
    return response.data;
  }

  async get(id: string): Promise<Payment> {
    const response = await this.client.get<Payment>(`/v1/payments/${id}`);
    return response.data;
  }

  async updateIntent(
    id: string,
    data: Partial<Pick<PaymentIntentRequest, 'amount' | 'metadata'>>,
    requestOptions?: RequestOptions
  ): Promise<Payment> {
    const response = await this.client.patch<Payment>(
      `/v1/payments/intents/${id}`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async confirm(id: string, requestOptions?: RequestOptions): Promise<Payment> {
    const response = await this.client.post<Payment>(
      `/v1/payments/${id}/confirm`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async confirmIntent(id: string, clientSecret: string, requestOptions?: RequestOptions): Promise<Payment> {
    const response = await this.client.post<Payment>(
      `/v1/payments/${id}/confirm-intent`,
      {},
      {
        ...(toRequestConfig(requestOptions) || {}),
        params: { client_secret: clientSecret },
      }
    );
    return response.data;
  }

  async cancel(id: string, requestOptions?: RequestOptions): Promise<Payment> {
    const response = await this.client.post<Payment>(
      `/v1/payments/${id}/cancel`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async retry(id: string, requestOptions?: RequestOptions): Promise<Payment> {
    const response = await this.client.post<Payment>(
      `/v1/payments/${id}/retry`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async refund(id: string, amount?: number, reason?: string, requestOptions?: RequestOptions): Promise<Refund> {
    const response = await this.client.post<Refund>(`/v1/payments/${id}/refund`, {
      amount,
      reason
    }, toRequestConfig(requestOptions));
    return response.data;
  }

  async getStats(params: Record<string, any> = {}): Promise<PaymentStats> {
    const response = await this.client.get<PaymentStats>('/v1/payments/stats', { params });
    return response.data;
  }
}
