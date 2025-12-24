import axios, { AxiosInstance } from 'axios';
import { PaymentsService } from './services/payments';
import { ConnectionsService } from './services/connections';
import { SubscriptionsService } from './services/subscriptions';
import { FraudService } from './services/fraud';

// Default API base URLs (secure HTTPS)
const API_BASE_URL_PRODUCTION = 'https://api.reevit.io';
const API_BASE_URL_SANDBOX = 'https://sandbox-api.reevit.io';

/**
 * Determines if an API key is for sandbox mode
 */
function isSandboxKey(apiKey: string): boolean {
  return apiKey.startsWith('sk_test_') || apiKey.startsWith('sk_sandbox_');
}

export class Reevit {
  private client: AxiosInstance;

  public payments: PaymentsService;
  public connections: ConnectionsService;
  public subscriptions: SubscriptionsService;
  public fraud: FraudService;

  constructor(apiKey: string, orgId: string, baseUrl?: string) {
    // Use provided baseUrl, or auto-detect based on API key prefix
    const resolvedBaseUrl = baseUrl || (isSandboxKey(apiKey) ? API_BASE_URL_SANDBOX : API_BASE_URL_PRODUCTION);

    this.client = axios.create({
      baseURL: resolvedBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'reevit-node/0.1.0',
        'X-Reevit-Key': apiKey,
        'X-Org-Id': orgId,
      },
    });

    this.payments = new PaymentsService(this.client);
    this.connections = new ConnectionsService(this.client);
    this.subscriptions = new SubscriptionsService(this.client);
    this.fraud = new FraudService(this.client);
  }
}

export * from './types';
