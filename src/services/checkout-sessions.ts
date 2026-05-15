import { AxiosInstance } from 'axios';
import { CheckoutSession, CheckoutSessionRequest, RequestOptions } from '../types';
import { toRequestConfig } from './utils';

export class CheckoutSessionsService {
  constructor(private client: AxiosInstance) {}

  async create(data: CheckoutSessionRequest, requestOptions?: RequestOptions): Promise<CheckoutSession> {
    const response = await this.client.post<CheckoutSession>(
      '/v1/checkout/sessions',
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }
}
