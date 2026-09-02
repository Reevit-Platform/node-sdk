import { AxiosInstance } from 'axios';
import {
  OutboundWebhook,
  PaginationOptions,
  RequestOptions,
  WebhookConfig,
  WebhookConfigInput,
  WebhookEvent,
  WebhookEventListOptions,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class WebhooksService {
  constructor(private client: AxiosInstance) { }

  async getConfig(): Promise<WebhookConfig> {
    const response = await this.client.get<WebhookConfig>('/v1/webhooks/config');
    return response.data;
  }

  async upsertConfig(data: WebhookConfigInput, requestOptions?: RequestOptions): Promise<WebhookConfig> {
    const response = await this.client.post<WebhookConfig>('/v1/webhooks/config', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async deleteConfig(requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete('/v1/webhooks/config', toRequestConfig(requestOptions));
  }

  async sendTest(requestOptions?: RequestOptions): Promise<Record<string, any>> {
    const response = await this.client.post<Record<string, any>>('/v1/webhooks/test', {}, toRequestConfig(requestOptions));
    return response.data;
  }

  async listEvents(options: WebhookEventListOptions = {}): Promise<WebhookEvent[]> {
    const response = await this.client.get('/v1/webhooks/events', { params: options });
    return extractArray<WebhookEvent>(response.data, 'events');
  }

  async getEvent(id: string): Promise<WebhookEvent> {
    const response = await this.client.get<WebhookEvent>(`/v1/webhooks/events/${encodeURIComponent(id)}`);
    return response.data;
  }

  async replayEvent(id: string, requestOptions?: RequestOptions): Promise<Record<string, any>> {
    const response = await this.client.post<Record<string, any>>(
      `/v1/webhooks/events/${encodeURIComponent(id)}/replay`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async listOutbound(options: PaginationOptions = {}): Promise<OutboundWebhook[]> {
    const response = await this.client.get('/v1/webhooks/outbound', { params: options });
    return extractArray<OutboundWebhook>(response.data, 'outbound');
  }

  async getOutbound(id: string): Promise<OutboundWebhook> {
    const response = await this.client.get<OutboundWebhook>(`/v1/webhooks/outbound/${encodeURIComponent(id)}`);
    return response.data;
  }
}
