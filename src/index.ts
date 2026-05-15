import axios, { AxiosInstance } from 'axios';
import { PaymentsService } from './services/payments';
import { ConnectionsService } from './services/connections';
import { SubscriptionsService } from './services/subscriptions';
import { FraudService } from './services/fraud';
import { CustomersService } from './services/customers';
import { PaymentLinksService } from './services/payment-links';
import { WebhooksService } from './services/webhooks';
import { RoutingRulesService } from './services/routing-rules';
import { InvoicesService } from './services/invoices';
import { CheckoutSessionsService } from './services/checkout-sessions';
import { ReevitClientOptions } from './types';
import { normalizeAxiosError } from './errors';

// Default API base URLs (secure HTTPS)
const API_BASE_URL_PRODUCTION = 'https://api.reevit.io';

/**
 * Determines if an API key is for sandbox mode
 */
function isSandboxKey(apiKey: string): boolean {
  return apiKey.startsWith('pfk_test_');
}

export class Reevit {
  private client: AxiosInstance;

  public payments: PaymentsService;
  public connections: ConnectionsService;
  public subscriptions: SubscriptionsService;
  public fraud: FraudService;
  public customers: CustomersService;
  public paymentLinks: PaymentLinksService;
  public webhooks: WebhooksService;
  public routingRules: RoutingRulesService;
  public invoices: InvoicesService;
  public checkoutSessions: CheckoutSessionsService;

  constructor(
    apiKey: string,
    orgId: string,
    baseUrlOrOptions?: string | ReevitClientOptions,
    maybeOptions?: ReevitClientOptions,
  ) {
    const options =
      typeof baseUrlOrOptions === 'string'
        ? { ...(maybeOptions || {}), baseUrl: baseUrlOrOptions }
        : (baseUrlOrOptions || {});

    const resolvedBaseUrl = options.baseUrl || API_BASE_URL_PRODUCTION;

    this.client = axios.create({
      baseURL: resolvedBaseUrl,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'reevit-node/0.9.0',
        'X-Reevit-Client': '@reevit/node',
        'X-Reevit-Client-Version': '0.9.0',
        'X-Reevit-Key': apiKey,
        'X-Org-Id': orgId,
      },
    });
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(normalizeAxiosError(error))
    );

    this.payments = new PaymentsService(this.client);
    this.connections = new ConnectionsService(this.client);
    this.subscriptions = new SubscriptionsService(this.client);
    this.fraud = new FraudService(this.client);
    this.customers = new CustomersService(this.client);
    this.paymentLinks = new PaymentLinksService(this.client);
    this.webhooks = new WebhooksService(this.client);
    this.routingRules = new RoutingRulesService(this.client);
    this.invoices = new InvoicesService(this.client);
    this.checkoutSessions = new CheckoutSessionsService(this.client);
  }
}

export * from './types';
export * from './errors';
