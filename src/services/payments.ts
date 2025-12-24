import { AxiosInstance } from 'axios';
import {
  Payment,
  PaymentIntentRequest,
  PaymentSummary,
  Refund
} from '../types';

export class PaymentsService {
  constructor(private client: AxiosInstance) { }

  async createIntent(data: PaymentIntentRequest): Promise<Payment> {
    const response = await this.client.post<Payment>('/v1/payments/intents', data);
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

  async refund(id: string, amount?: number, reason?: string): Promise<Refund> {
    const response = await this.client.post<Refund>(`/v1/payments/${id}/refund`, {
      amount,
      reason
    });
    return response.data;
  }
}
