import { AxiosInstance } from 'axios';
import {
  RequestOptions,
  RoutingRule,
  RoutingRuleCreateRequest,
  RoutingRuleUpdateRequest,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class RoutingRulesService {
  constructor(private client: AxiosInstance) { }

  async list(): Promise<RoutingRule[]> {
    const response = await this.client.get('/v1/routing-rules');
    return extractArray<RoutingRule>(response.data, 'rules');
  }

  async create(data: RoutingRuleCreateRequest, requestOptions?: RequestOptions): Promise<RoutingRule> {
    const response = await this.client.post<RoutingRule>('/v1/routing-rules', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async get(id: string): Promise<RoutingRule> {
    const response = await this.client.get<RoutingRule>(`/v1/routing-rules/${encodeURIComponent(id)}`);
    return response.data;
  }

  async update(id: string, data: RoutingRuleUpdateRequest, requestOptions?: RequestOptions): Promise<RoutingRule> {
    const response = await this.client.patch<RoutingRule>(`/v1/routing-rules/${encodeURIComponent(id)}`, data, toRequestConfig(requestOptions));
    return response.data;
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete(`/v1/routing-rules/${encodeURIComponent(id)}`, toRequestConfig(requestOptions));
  }
}
