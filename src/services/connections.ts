import { AxiosInstance } from 'axios';
import {
  Connection,
  ConnectionAuditEntry,
  ConnectionLabelsUpdate,
  ConnectionListOptions,
  ConnectionRequest,
  ConnectionStatusUpdate,
  RequestOptions,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class ConnectionsService {
  constructor(private client: AxiosInstance) { }

  async create(data: ConnectionRequest, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.post<Connection>('/v1/connections', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async list(options: ConnectionListOptions = {}): Promise<Connection[]> {
    const response = await this.client.get('/v1/connections', { params: options });
    return extractArray<Connection>(response.data, 'connections');
  }

  async get(id: string): Promise<Connection> {
    const response = await this.client.get<Connection>(`/v1/connections/${id}`);
    return response.data;
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete(`/v1/connections/${id}`, toRequestConfig(requestOptions));
  }

  async validate(id: string, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.post<Connection>(
      `/v1/connections/${id}/validate`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async getAudit(id: string, options: ConnectionListOptions = {}): Promise<ConnectionAuditEntry[]> {
    const response = await this.client.get(`/v1/connections/${id}/audit`, { params: options });
    return extractArray<ConnectionAuditEntry>(response.data, 'audit');
  }

  async updateLabels(id: string, data: ConnectionLabelsUpdate, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.patch<Connection>(
      `/v1/connections/${id}/labels`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async updateStatus(id: string, data: ConnectionStatusUpdate, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.patch<Connection>(
      `/v1/connections/${id}/status`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async test(data: ConnectionRequest, requestOptions?: RequestOptions): Promise<boolean> {
    const response = await this.client.post<{ success: boolean }>('/v1/connections/test', data, toRequestConfig(requestOptions));
    return response.data.success;
  }
}
