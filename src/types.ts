export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  method?: string;
  country: string;
  description?: string;
  reference?: string;
  customer_id?: string;
  policy?: FraudPolicyInput;
  metadata?: Record<string, any>;
}

export interface FraudPolicyInput {
  prefer?: string[];
  allowed_providers?: string[];
  max_amount?: number;
  blocked_bins?: string[];
  allowed_bins?: string[];
  velocity_max_per_minute?: number;
}

export interface ReevitClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export interface RequestOptions {
  idempotencyKey?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaymentIntentResponse {
  id: string;
  org_id?: string;
  connection_id: string;
  provider: string;
  provider_ref_id?: string;
  status: string;
  client_secret?: string;
  session_secret?: string;
  psp_public_key?: string;
  psp_credentials?: Record<string, any>;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string;
  net_amount: number;
  reference?: string;
  available_psps?: Array<{
    provider: string;
    name: string;
    methods: string[];
    countries?: string[];
  }>;
  branding?: Record<string, any>;
}

export interface CheckoutSessionRequest extends PaymentIntentRequest {}

export interface CheckoutSession {
  id: string;
  client_secret: string;
  session_secret: string;
  payment_intent: PaymentIntentResponse;
  expires_at?: string;
}

export interface Payment {
  id: string;
  connection_id: string;
  provider: string;
  provider_ref_id: string;
  reference?: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string;
  net_amount: number;
  customer_id: string;
  metadata: Record<string, any>;
  route: PaymentRouteAttempt[];
  created_at: string;
  updated_at: string;
  /** Payment source type (payment_link, api, subscription) */
  source?: PaymentSource;
  /** ID of the source (payment link ID, subscription ID, etc.) */
  source_id?: string;
  /** Human-readable description of the source (e.g., payment link name) */
  source_description?: string;
}

/** Payment source type - indicates where the payment originated from */
export type PaymentSource = 'payment_link' | 'api' | 'subscription';

export interface PaymentSummary {
  id: string;
  connection_id: string;
  provider: string;
  reference?: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string;
  net_amount: number;
  customer_id: string;
  metadata: Record<string, any>;
  created_at: string;
  /** Payment source type (payment_link, api, subscription) */
  source?: PaymentSource;
  /** ID of the source (payment link ID, subscription ID, etc.) */
  source_id?: string;
  /** Human-readable description of the source (e.g., payment link name) */
  source_description?: string;
}

export interface PaymentStatsBreakdown {
  key: string;
  count: number;
  amount: number;
}

export interface PaymentStatsTotals {
  count: number;
  amount: number;
  succeeded: number;
  failed: number;
  refunded: number;
}

export interface PaymentStats {
  totals?: PaymentStatsTotals;
  by_provider?: PaymentStatsBreakdown[];
  by_method?: PaymentStatsBreakdown[];
  [key: string]: any;
}

export interface PaymentRouteAttempt {
  connection_id: string;
  provider: string;
  status: string;
  error: string;
  labels: string[];
  routing_hints?: RoutingHints;
}

export interface RoutingHints {
  country_preference: string[];
  method_bias: Record<string, string>;
  fallback_only: boolean;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  reason: string;
  created_at: string;
}

export interface ConnectionRequest {
  provider: string;
  mode: string;
  credentials: Record<string, any>;
  capabilities?: Record<string, any>;
  routing_hints?: RoutingHints;
  labels?: string[];
}

export interface Connection {
  id: string;
  provider: string;
  mode: string;
  status: string;
  capabilities: Record<string, any>;
  routing_hints: RoutingHints;
  labels: string[];
}

export interface ConnectionListOptions extends PaginationOptions {
  label?: string;
  provider?: string;
  status?: string;
}

export interface ConnectionAuditEntry {
  id?: string | number;
  action?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  [key: string]: any;
}

export interface ConnectionStatusUpdate {
  status: 'active' | 'inactive';
}

export interface ConnectionLabelsUpdate {
  labels: string[];
}

export interface SubscriptionRequest {
  customer_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  method: string;
  interval: 'monthly' | 'yearly';
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  org_id: string;
  customer_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  method: string;
  interval: string;
  status: string;
  next_renewal_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionListOptions extends PaginationOptions {
  status?: 'active' | 'paused' | 'canceled';
  customer_id?: string;
  plan_id?: string;
  created_after?: string;
  created_before?: string;
}

export interface SubscriptionUpdateRequest {
  plan_id?: string;
  amount?: number;
  interval?: 'monthly' | 'yearly';
  metadata?: Record<string, any>;
}

export interface FraudPolicy {
  prefer: string[];
  max_amount: number;
  blocked_bins: string[];
  allowed_bins: string[];
  velocity_max_per_minute: number;
}

export interface Customer {
  id: string;
  org_id?: string;
  external_id?: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
  total_payments?: number;
  total_amount?: number;
  last_payment_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CreateCustomerInput {
  external_id?: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface CustomerListOptions extends PaginationOptions {
  search?: string;
  sort_by?: string;
  sort_desc?: boolean;
  currency?: string;
  provider?: string;
  payment_method?: string;
  activity_status?: string;
  min_spend?: number;
  max_spend?: number;
  tags?: string;
}

export interface TopCustomerOptions {
  limit?: number;
  metric?: 'total_spent' | 'payment_count';
  period?: '7d' | '30d' | '90d' | 'all';
}

export interface PaymentLink {
  id: string;
  code?: string;
  name?: string;
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface CreatePaymentLinkInput {
  [key: string]: any;
}

export interface UpdatePaymentLinkInput {
  [key: string]: any;
}

export interface PaymentLinkListOptions extends PaginationOptions {
  active?: boolean;
  search?: string;
}

export interface PaymentLinkStats {
  [key: string]: any;
}

export interface WebhookConfig {
  url: string;
  events?: string[];
  signing_secret?: string;
  org_id?: string;
}

export interface WebhookConfigInput {
  url: string;
  events?: string[];
}

export interface WebhookEvent {
  id: string;
  provider?: string;
  event_type?: string;
  status?: string;
  payload?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface WebhookEventListOptions extends PaginationOptions {
  status?: string;
  provider?: string;
  event_type?: string;
}

export interface OutboundWebhook {
  id: string;
  event_type?: string;
  target_url?: string;
  status?: string;
  attempts?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface RoutingRule {
  id: string;
  name: string;
  countries: string[];
  methods?: string[];
  connection_id: string;
  priority?: number;
  fallback_to_default?: boolean;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoutingRuleCreateRequest {
  name: string;
  countries: string[];
  connection_id: string;
  methods?: string[];
  priority?: number;
  fallback_to_default?: boolean;
  enabled?: boolean;
}

export interface RoutingRuleUpdateRequest {
  name?: string;
  countries?: string[];
  methods?: string[];
  connection_id?: string;
  priority?: number;
  fallback_to_default?: boolean;
  enabled?: boolean;
}

export interface Invoice {
  id: string;
  subscription_id?: string;
  org_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_id?: string;
  due_at?: string;
  metadata?: Record<string, any>;
  retry_count?: number;
  max_retries?: number;
  next_retry_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface InvoiceListOptions extends PaginationOptions {
  subscription_id?: string;
  status?: string;
}

export interface InvoiceUpdateRequest {
  [key: string]: any;
}
