export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  method: string;
  country: string;
  reference?: string;
  customer_id?: string;
  policy?: FraudPolicyInput;
  metadata?: Record<string, any>;
}

export interface FraudPolicyInput {
  prefer?: string[];
  max_amount?: number;
  blocked_bins?: string[];
  allowed_bins?: string[];
  velocity_max_per_minute?: number;
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

export interface FraudPolicy {
  prefer: string[];
  max_amount: number;
  blocked_bins: string[];
  allowed_bins: string[];
  velocity_max_per_minute: number;
}
