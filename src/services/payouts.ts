import { AxiosInstance } from 'axios';
import {
  AccountResolution,
  Beneficiary,
  BeneficiaryListResponse,
  BulkPayoutInput,
  BulkPayoutResponse,
  CreatePayoutInput,
  PaginationOptions,
  Payout,
  PayoutBalance,
  PayoutListOptions,
  PayoutListResponse,
  RequestOptions,
  SavedBeneficiary,
} from '../types';
import { toRequestConfig } from './utils';

export class PayoutsService {
  constructor(private client: AxiosInstance) { }

  async create(data: CreatePayoutInput, options: RequestOptions): Promise<Payout> {
    this.requireIdempotencyKey(options);
    const response = await this.client.post<Payout>('/v1/payouts', data, toRequestConfig(options));
    return response.data;
  }

  async list(options: PayoutListOptions = {}): Promise<PayoutListResponse> {
    const response = await this.client.get<PayoutListResponse>('/v1/payouts', { params: options });
    return response.data;
  }

  async get(id: string): Promise<Payout> {
    const response = await this.client.get<Payout>(`/v1/payouts/${id}`);
    return response.data;
  }

  async confirm(id: string): Promise<Payout> {
    const response = await this.client.post<Payout>(`/v1/payouts/${id}/confirm`, {});
    return response.data;
  }

  async cancel(id: string): Promise<Payout> {
    const response = await this.client.post<Payout>(`/v1/payouts/${id}/cancel`, {});
    return response.data;
  }

  async createBulk(data: BulkPayoutInput, options: RequestOptions): Promise<BulkPayoutResponse> {
    this.requireIdempotencyKey(options);
    const response = await this.client.post<BulkPayoutResponse>(
      '/v1/payouts/bulk',
      data,
      toRequestConfig(options),
    );
    return response.data;
  }

  async balance(connectionId: string): Promise<PayoutBalance[]> {
    const response = await this.client.get<{ balances: PayoutBalance[] }>('/v1/payouts/balance', {
      params: { connection_id: connectionId },
    });
    return response.data.balances;
  }

  async resolveAccount(connectionId: string, beneficiary: Beneficiary): Promise<AccountResolution> {
    const response = await this.client.post<AccountResolution>('/v1/payouts/resolve-account', {
      connection_id: connectionId,
      beneficiary,
    });
    return response.data;
  }

  async createBeneficiary(beneficiary: Beneficiary): Promise<SavedBeneficiary> {
    const response = await this.client.post<SavedBeneficiary>('/v1/beneficiaries', { beneficiary });
    return response.data;
  }

  async listBeneficiaries(options: PaginationOptions = {}): Promise<BeneficiaryListResponse> {
    const response = await this.client.get<BeneficiaryListResponse>('/v1/beneficiaries', {
      params: options,
    });
    return response.data;
  }

  async getBeneficiary(id: string): Promise<SavedBeneficiary> {
    const response = await this.client.get<SavedBeneficiary>(`/v1/beneficiaries/${id}`);
    return response.data;
  }

  async deleteBeneficiary(id: string): Promise<void> {
    await this.client.delete(`/v1/beneficiaries/${id}`);
  }

  private requireIdempotencyKey(options: RequestOptions): void {
    if (!options?.idempotencyKey?.trim()) {
      throw new Error('idempotencyKey is required for payout creation');
    }
  }
}
