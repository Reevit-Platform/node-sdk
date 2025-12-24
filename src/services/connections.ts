import { AxiosInstance } from 'axios';
import { Connection, ConnectionRequest } from '../types';

export class ConnectionsService {
  constructor(private client: AxiosInstance) { }

  async create(data: ConnectionRequest): Promise<Connection> {
    const response = await this.client.post<Connection>('/v1/connections', data);
    return response.data;
  }

  async list(): Promise<Connection[]> {
    const response = await this.client.get<Connection[]>('/v1/connections');
    return response.data;
  }

  async test(data: ConnectionRequest): Promise<boolean> {
    const response = await this.client.post<{ success: boolean }>('/v1/connections/test', data);
    return response.data.success;
  }
}
