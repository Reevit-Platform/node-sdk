import { AxiosInstance } from 'axios';
import { FraudPolicy } from '../types';

export class FraudService {
  constructor(private client: AxiosInstance) { }

  async get(): Promise<FraudPolicy> {
    const response = await this.client.get<FraudPolicy>('/v1/policies/fraud');
    return response.data;
  }

  async update(policy: FraudPolicy): Promise<FraudPolicy> {
    const response = await this.client.post<FraudPolicy>('/v1/policies/fraud', policy);
    return response.data;
  }
}
