import { AxiosInstance } from 'axios';
import {
  CreatePaymentLinkInput,
  PaginationOptions,
  PaymentLink,
  PaymentLinkListOptions,
  PaymentLinkStats,
  PaymentSummary,
  RequestOptions,
  UpdatePaymentLinkInput,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class PaymentLinksService {
  constructor(private client: AxiosInstance) { }

  async list(options: PaymentLinkListOptions = {}): Promise<PaymentLink[]> {
    const response = await this.client.get('/v1/payment-links', { params: options });
    return extractArray<PaymentLink>(response.data, 'payment_links');
  }

  async create(data: CreatePaymentLinkInput, requestOptions?: RequestOptions): Promise<PaymentLink> {
    const response = await this.client.post<PaymentLink>('/v1/payment-links', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async get(id: string): Promise<PaymentLink> {
    const response = await this.client.get<PaymentLink>(`/v1/payment-links/${encodeURIComponent(id)}`);
    return response.data;
  }

  async update(id: string, data: UpdatePaymentLinkInput, requestOptions?: RequestOptions): Promise<PaymentLink> {
    const response = await this.client.patch<PaymentLink>(`/v1/payment-links/${encodeURIComponent(id)}`, data, toRequestConfig(requestOptions));
    return response.data;
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete(`/v1/payment-links/${encodeURIComponent(id)}`, toRequestConfig(requestOptions));
  }

  async getStats(id: string): Promise<PaymentLinkStats> {
    const response = await this.client.get<PaymentLinkStats>(`/v1/payment-links/${encodeURIComponent(id)}/stats`);
    return response.data;
  }

  async listPayments(id: string, options: PaginationOptions = {}): Promise<PaymentSummary[]> {
    const response = await this.client.get(`/v1/payment-links/${encodeURIComponent(id)}/payments`, { params: options });
    return extractArray<PaymentSummary>(response.data, 'payments');
  }

  async getByCode(code: string): Promise<PaymentLink> {
    const response = await this.client.get<PaymentLink>(`/v1/pay/${encodeURIComponent(code)}`);
    return response.data;
  }
}
