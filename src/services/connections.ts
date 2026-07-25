import { AxiosInstance } from 'axios';
import {
  Connection,
  ConnectionAuditEntry,
  ConnectionLabelsUpdate,
  ConnectionLabelStat,
  ConnectionFilterOptions,
  ConnectionListPage,
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
    return (await this.listPage(options)).connections;
  }

  async listPage(options: ConnectionListOptions = {}): Promise<ConnectionListPage> {
    const response = await this.client.get('/v1/connections', { params: options });
    return this.parseListPage(response.data, options);
  }

  async listAll(options: ConnectionFilterOptions = {}): Promise<Connection[]> {
    const connections: Connection[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.listPage({ ...options, limit: 200, offset });
      connections.push(...page.connections);

      const nextOffset = offset + page.connections.length;
      if (page.connections.length === 0 || nextOffset >= page.pagination.total) {
        return connections;
      }
      offset = nextOffset;
    }
  }

  async get(id: string): Promise<Connection> {
    const response = await this.client.get<Connection>(`/v1/connections/${encodeURIComponent(id)}`);
    return response.data;
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete(`/v1/connections/${encodeURIComponent(id)}`, toRequestConfig(requestOptions));
  }

  async validate(id: string, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.post<Connection>(
      `/v1/connections/${encodeURIComponent(id)}/validate`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async getAudit(id: string, options: ConnectionListOptions = {}): Promise<ConnectionAuditEntry[]> {
    const response = await this.client.get(`/v1/connections/${encodeURIComponent(id)}/audit`, { params: options });
    return extractArray<ConnectionAuditEntry>(response.data, 'audit');
  }

  async listLabels(): Promise<ConnectionLabelStat[]> {
    const response = await this.client.get<ConnectionLabelStat[]>('/v1/connections/labels');
    if (!Array.isArray(response.data)) {
      throw new Error('unexpected connection labels response: expected an array');
    }
    return response.data;
  }

  async updateLabels(id: string, data: ConnectionLabelsUpdate, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.patch<Connection>(
      `/v1/connections/${encodeURIComponent(id)}/labels`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async updateStatus(id: string, data: ConnectionStatusUpdate, requestOptions?: RequestOptions): Promise<Connection> {
    const response = await this.client.patch<Connection>(
      `/v1/connections/${encodeURIComponent(id)}/status`,
      data,
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async test(data: ConnectionRequest, requestOptions?: RequestOptions): Promise<boolean> {
    const response = await this.client.post<{ ok?: boolean; success?: boolean }>(
      '/v1/connections/test',
      data,
      toRequestConfig(requestOptions),
    );
    return response.data.ok ?? response.data.success ?? false;
  }

  private parseListPage(data: unknown, options: ConnectionListOptions): ConnectionListPage {
    if (Array.isArray(data)) {
      return {
        connections: data as Connection[],
        pagination: {
          total: data.length,
          limit: options.limit ?? data.length,
          offset: options.offset ?? 0,
        },
      };
    }

    if (!data || typeof data !== 'object') {
      throw new Error('unexpected connections response: expected an object');
    }

    const payload = data as Record<string, unknown>;
    if (!Array.isArray(payload.connections)) {
      throw new Error('unexpected connections response: missing connections array');
    }

    const pagination =
      payload.pagination && typeof payload.pagination === 'object'
        ? (payload.pagination as Record<string, unknown>)
        : {};
    const total = Number(pagination.total);
    const limit = Number(pagination.limit);
    const offset = Number(pagination.offset);

    return {
      connections: payload.connections as Connection[],
      pagination: {
        total: Number.isFinite(total) ? total : payload.connections.length,
        limit: Number.isFinite(limit) ? limit : (options.limit ?? payload.connections.length),
        offset: Number.isFinite(offset) ? offset : (options.offset ?? 0),
      },
    };
  }
}
