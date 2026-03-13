import { AxiosInstance } from 'axios';
import {
  CreateCustomerInput,
  Customer,
  CustomerListOptions,
  PaginationOptions,
  PaymentSummary,
  RequestOptions,
  TopCustomerOptions,
  UpdateCustomerInput,
} from '../types';
import { extractArray, toRequestConfig } from './utils';

export class CustomersService {
  constructor(private client: AxiosInstance) { }

  async list(options: CustomerListOptions = {}): Promise<Customer[]> {
    const response = await this.client.get('/v1/customers', { params: options });
    return extractArray<Customer>(response.data, 'customers');
  }

  async create(data: CreateCustomerInput, requestOptions?: RequestOptions): Promise<Customer> {
    const response = await this.client.post<Customer>('/v1/customers', data, toRequestConfig(requestOptions));
    return response.data;
  }

  async get(id: string): Promise<Customer> {
    const response = await this.client.get<Customer>(`/v1/customers/${id}`);
    return response.data;
  }

  async update(id: string, data: UpdateCustomerInput, requestOptions?: RequestOptions): Promise<Customer> {
    const response = await this.client.patch<Customer>(`/v1/customers/${id}`, data, toRequestConfig(requestOptions));
    return response.data;
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.client.delete(`/v1/customers/${id}`, toRequestConfig(requestOptions));
  }

  async lookup(externalId: string): Promise<Customer> {
    const response = await this.client.get<Customer>('/v1/customers/lookup', {
      params: { external_id: externalId },
    });
    return response.data;
  }

  async getTopCustomers(options: TopCustomerOptions = {}): Promise<Customer[]> {
    const response = await this.client.get('/v1/customers/top', { params: options });
    return extractArray<Customer>(response.data, 'customers');
  }

  async getPaymentHistory(id: string, options: PaginationOptions = {}): Promise<PaymentSummary[]> {
    const response = await this.client.get(`/v1/customers/${id}/payments`, { params: options });
    return extractArray<PaymentSummary>(response.data, 'payments');
  }
}
