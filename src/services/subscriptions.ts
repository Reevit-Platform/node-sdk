import { AxiosInstance } from 'axios';
import { Subscription, SubscriptionRequest } from '../types';

export class SubscriptionsService {
  constructor(private client: AxiosInstance) { }

  async create(data: SubscriptionRequest): Promise<Subscription> {
    const response = await this.client.post<Subscription>('/v1/subscriptions', data);
    return response.data;
  }

  async list(): Promise<Subscription[]> {
    const response = await this.client.get<Subscription[]>('/v1/subscriptions');
    return response.data;
  }
}
