import { AxiosInstance } from 'axios';
import {
  Invoice,
  InvoiceListOptions,
  InvoiceUpdateRequest,
  RequestOptions,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class InvoicesService {
  constructor(private client: AxiosInstance) { }

  async list(options: InvoiceListOptions = {}): Promise<Invoice[]> {
    const response = await this.client.get('/v1/invoices', { params: options });
    return extractArray<Invoice>(response.data, 'invoices');
  }

  async get(id: string): Promise<Invoice> {
    const response = await this.client.get<Invoice>(`/v1/invoices/${encodeURIComponent(id)}`);
    return response.data;
  }

  async update(id: string, data: InvoiceUpdateRequest, requestOptions?: RequestOptions): Promise<Invoice> {
    const response = await this.client.patch<Invoice>(`/v1/invoices/${encodeURIComponent(id)}`, data, toRequestConfig(requestOptions));
    return response.data;
  }

  async cancel(id: string, requestOptions?: RequestOptions): Promise<Invoice> {
    const response = await this.client.post<Invoice>(
      `/v1/invoices/${encodeURIComponent(id)}/cancel`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }

  async retry(id: string, requestOptions?: RequestOptions): Promise<Invoice> {
    const response = await this.client.post<Invoice>(
      `/v1/invoices/${encodeURIComponent(id)}/retry`,
      {},
      toRequestConfig(requestOptions)
    );
    return response.data;
  }
}
