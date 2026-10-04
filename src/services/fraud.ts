import { AxiosInstance } from 'axios';
import { FraudPolicy, RequestOptions } from '../types';
import { toRequestConfig } from './utils';

export class FraudService {
  constructor(private client: AxiosInstance) { }

  async get(): Promise<FraudPolicy> {
    const response = await this.client.get<FraudPolicy>('/v1/policies/fraud');
    return response.data;
  }

  async update(policy: FraudPolicy, requestOptions?: RequestOptions): Promise<FraudPolicy> {
    // The standalone policy endpoint accepts only these writable fields.
    // Older callers may still supply `prefer`, or pass a GET result containing
    // response metadata. Those fields belong outside this mutation's payload.
    const body = {
      max_amount: policy.max_amount,
      blocked_bins: policy.blocked_bins,
      allowed_bins: policy.allowed_bins,
      velocity_max_per_minute: policy.velocity_max_per_minute,
    };
    const response = await this.client.post<FraudPolicy>('/v1/policies/fraud', body, toRequestConfig(requestOptions));
    return response.data;
  }
}
