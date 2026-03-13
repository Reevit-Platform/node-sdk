import { AxiosInstance } from 'axios';
import {
  RequestOptions,
  Subscription,
  SubscriptionListOptions,
  SubscriptionRequest,
  SubscriptionUpdateRequest,
} from '../types';
import { toRequestConfig } from './utils';

export class SubscriptionsService {
  constructor(private client: AxiosInstance) { }

  async create(data: SubscriptionRequest, requestOptions?: RequestOptions): Promise<Subscription> {
    const response = await this.client.post<Subscription>('/v1/subscriptions', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async list(options: SubscriptionListOptions = {}): Promise<Subscription[]> {
    const response = await this.client.get<Subscription[]>('/v1/subscriptions', { params: options });
    return response.data;
  }

  async get(id: string): Promise<Subscription> {
    const response = await this.client.get<Subscription>(`/v1/subscriptions/${id}`);
    return response.data;
  }

  async update(id: string, data: SubscriptionUpdateRequest, requestOptions?: RequestOptions): Promise<Subscription> {
    const response = await this.client.patch<Subscription>(
      `/v1/subscriptions/${id}`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async cancel(id: string, requestOptions?: RequestOptions): Promise<Subscription> {
    const response = await this.client.post<Subscription>(
      `/v1/subscriptions/${id}/cancel`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async resume(id: string, requestOptions?: RequestOptions): Promise<Subscription> {
    const response = await this.client.post<Subscription>(
      `/v1/subscriptions/${id}/resume`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }
}
