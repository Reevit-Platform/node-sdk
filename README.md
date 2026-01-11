# Reevit TypeScript SDK

The official Node.js/TypeScript SDK for [Reevit](https://reevit.io) — a unified payment orchestration platform for Africa.

[![npm version](https://img.shields.io/npm/v/@reevit/node.svg)](https://www.npmjs.com/package/@reevit/node)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Payments](#payments)
  - [Create Payment Intent](#create-payment-intent)
  - [Get Payment](#get-payment)
  - [List Payments](#list-payments)
  - [Refund Payment](#refund-payment)
- [Connections](#connections)
  - [Create Connection](#create-connection)
  - [List Connections](#list-connections)
  - [Test Connection](#test-connection)
- [Subscriptions](#subscriptions)
  - [Create Subscription](#create-subscription)
  - [List Subscriptions](#list-subscriptions)
- [Fraud Protection](#fraud-protection)
  - [Get Fraud Policy](#get-fraud-policy)
  - [Update Fraud Policy](#update-fraud-policy)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [Supported Providers](#supported-providers)
- [Examples](#examples)

---

## Installation

```bash
npm install @reevit/node@0.5.0
```

Or using yarn:

```bash
yarn add @reevit/node
```

Or using pnpm:

```bash
pnpm add @reevit/node
```

---

## Quick Start

```typescript
import { Reevit } from '@reevit/node';

// Initialize the client
const reevit = new Reevit(
  'pfk_live_your_api_key',  // Your API key
  'org_your_org_id'          // Your organization ID
);

// Create a payment
const payment = await reevit.payments.createIntent({
  amount: 5000,      // 50.00 GHS (amount in smallest currency unit)
  currency: 'GHS',
  method: 'momo',
  country: 'GH',
  customer_id: 'cust_123'
});

console.log('Payment ID:', payment.id);
console.log('Status:', payment.status);
```

---

## Configuration

### Basic Configuration

```typescript
import { Reevit } from '@reevit/node';

const reevit = new Reevit(
  'pfk_live_your_api_key',   // API Key (required)
  'org_your_org_id',          // Organization ID (required)
  'https://api.reevit.io'  // Base URL (optional, defaults to localhost:8080)
);
```

### Environment Variables (Recommended)

```typescript
import { Reevit } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!,
  process.env.REEVIT_BASE_URL || 'https://api.reevit.io'
);
```

### API Key Types

| Key Prefix | Environment | Description |
|------------|-------------|-------------|
| `pfk_live_` | Production | Live transactions, real money |
| `pfk_test_` | Sandbox | Test transactions, no real charges |

---

## Payments

### Create Payment Intent

Create a new payment intent to initiate a transaction.

```typescript
const payment = await reevit.payments.createIntent({
  amount: 10000,           // 100.00 in smallest currency unit
  currency: 'GHS',         // Currency code (GHS, NGN, KES, USD)
  method: 'momo',          // Payment method
  country: 'GH',           // ISO country code
  customer_id: 'cust_123', // Optional: Your customer reference
  metadata: {              // Optional: Custom metadata
    order_id: 'order_456',
    product: 'Premium Plan'
  }
});
```

#### Payment Methods by Country

| Country | Code | Supported Methods |
|---------|------|-------------------|
| Ghana | `GH` | `momo`, `card`, `bank_transfer`, `apple_pay`, `google_pay` |
| Nigeria | `NG` | `card`, `bank_transfer`, `ussd`, `apple_pay`, `google_pay` |
| Kenya | `KE` | `mpesa`, `card`, `apple_pay`, `google_pay` |

#### Full Example with All Options

```typescript
const payment = await reevit.payments.createIntent({
  amount: 25000,
  currency: 'NGN',
  method: 'card',
  country: 'NG',
  customer_id: 'cust_789',
  metadata: {
    order_id: 'ORD-2024-001',
    customer_email: 'customer@example.com',
    description: 'Monthly subscription'
  },
  policy: {
    prefer: ['paystack', 'flutterwave'],  // Preferred providers
    max_amount: 100000,                    // Max transaction amount
    velocity_max_per_minute: 5             // Rate limiting
  }
});

console.log('Payment created:', {
  id: payment.id,
  status: payment.status,
  provider: payment.provider,
  providerRef: payment.provider_ref_id
});
```

### Get Payment

Retrieve details of a specific payment.

```typescript
const payment = await reevit.payments.get('pay_abc123');

console.log('Payment Details:', {
  id: payment.id,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  fee: payment.fee_amount,
  net: payment.net_amount,
  provider: payment.provider,
  method: payment.method,
  createdAt: payment.created_at
});

// Check routing attempts (useful for debugging)
if (payment.route && payment.route.length > 0) {
  console.log('Routing attempts:');
  payment.route.forEach((attempt, index) => {
    console.log(`  ${index + 1}. ${attempt.provider}: ${attempt.status}`);
    if (attempt.error) {
      console.log(`     Error: ${attempt.error}`);
    }
  });
}
```

### List Payments

Retrieve a paginated list of payments.

```typescript
// Basic listing (default: 50 payments)
const payments = await reevit.payments.list();

// With pagination
const page1 = await reevit.payments.list(10, 0);   // First 10
const page2 = await reevit.payments.list(10, 10);  // Next 10

// Process payments
payments.forEach(payment => {
  console.log(`${payment.id}: ${payment.status} - ${payment.currency} ${payment.amount / 100}`);
});
```

#### Pagination Example

```typescript
import { PaymentSummary } from '@reevit/node';

async function getAllPayments(): Promise<PaymentSummary[]> {
  const allPayments: PaymentSummary[] = [];
  const pageSize = 50;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await reevit.payments.list(pageSize, offset);
    allPayments.push(...batch);
    
    if (batch.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allPayments;
}
```

### Refund Payment

Issue a full or partial refund for a payment.

```typescript
// Full refund
const fullRefund = await reevit.payments.refund('pay_abc123');

// Partial refund
const partialRefund = await reevit.payments.refund(
  'pay_abc123',
  2500,                    // Refund 25.00
  'Customer requested'     // Reason (optional)
);

console.log('Refund:', {
  id: partialRefund.id,
  paymentId: partialRefund.payment_id,
  amount: partialRefund.amount,
  status: partialRefund.status,
  reason: partialRefund.reason
});
```

---

## Connections

Connections represent your integrations with payment service providers (PSPs).

### Create Connection

```typescript
// Paystack Connection (Nigeria)
const paystackConnection = await reevit.connections.create({
  provider: 'paystack',
  mode: 'live',  // 'live' or 'test'
  credentials: {
    secret_key: 'sk_live_xxxxx'
  },
  labels: ['nigeria', 'primary'],
  routing_hints: {
    country_preference: ['NG'],
    method_bias: { card: 'high', bank_transfer: 'medium' },
    fallback_only: false
  }
});

// Flutterwave Connection (Multi-country)
const flutterwaveConnection = await reevit.connections.create({
  provider: 'flutterwave',
  mode: 'live',
  credentials: {
    secret_key: 'FLWSECK-xxxxx',
    encryption_key: 'xxxxx'
  },
  labels: ['multi-country', 'backup'],
  routing_hints: {
    country_preference: ['GH', 'NG', 'KE'],
    fallback_only: true
  }
});

// Hubtel Connection (Ghana)
const hubtelConnection = await reevit.connections.create({
  provider: 'hubtel',
  mode: 'live',
  credentials: {
    client_id: 'xxxxx',
    client_secret: 'xxxxx'
  },
  labels: ['ghana', 'momo'],
  routing_hints: {
    country_preference: ['GH'],
    method_bias: { momo: 'high' }
  }
});

// M-Pesa Connection (Kenya)
const mpesaConnection = await reevit.connections.create({
  provider: 'mpesa',
  mode: 'live',
  credentials: {
    consumer_key: 'xxxxx',
    consumer_secret: 'xxxxx',
    passkey: 'xxxxx',
    shortcode: '174379',
    initiator_name: 'testapi',
    security_credential: 'xxxxx'  // Pre-encrypted
  },
  labels: ['kenya', 'mpesa'],
  routing_hints: {
    country_preference: ['KE'],
    method_bias: { mpesa: 'high' }
  }
});

// Monnify Connection (Nigeria)
const monnifyConnection = await reevit.connections.create({
  provider: 'monnify',
  mode: 'live',
  credentials: {
    api_key: 'xxxxx',
    secret_key: 'xxxxx',
    contract_code: 'xxxxx'
  },
  labels: ['nigeria', 'bank_transfer'],
  routing_hints: {
    country_preference: ['NG'],
    method_bias: { bank_transfer: 'high' }
  }
});
```

### List Connections

```typescript
const connections = await reevit.connections.list();

connections.forEach(conn => {
  console.log(`${conn.provider} (${conn.mode}): ${conn.status}`);
  console.log(`  Labels: ${conn.labels.join(', ')}`);
  console.log(`  Countries: ${conn.routing_hints.country_preference.join(', ')}`);
});
```

### Test Connection

Verify credentials before creating a connection.

```typescript
const isValid = await reevit.connections.test({
  provider: 'paystack',
  mode: 'live',
  credentials: {
    secret_key: 'sk_live_xxxxx'
  }
});

if (isValid) {
  console.log('Connection credentials are valid');
} else {
  console.log('Invalid credentials');
}
```

---

## Subscriptions

Manage recurring billing and subscriptions.

### Create Subscription

```typescript
// Monthly subscription
const monthlySubscription = await reevit.subscriptions.create({
  customer_id: 'cust_123',
  plan_id: 'plan_premium',
  amount: 9900,           // 99.00 per month
  currency: 'GHS',
  method: 'momo',
  interval: 'monthly',
  metadata: {
    plan_name: 'Premium',
    features: ['unlimited_access', 'priority_support']
  }
});

// Yearly subscription
const yearlySubscription = await reevit.subscriptions.create({
  customer_id: 'cust_456',
  plan_id: 'plan_enterprise',
  amount: 99900,          // 999.00 per year
  currency: 'NGN',
  method: 'card',
  interval: 'yearly',
  metadata: {
    plan_name: 'Enterprise',
    discount_applied: '2_months_free'
  }
});

console.log('Subscription created:', {
  id: monthlySubscription.id,
  status: monthlySubscription.status,
  nextRenewal: monthlySubscription.next_renewal_at
});
```

### List Subscriptions

```typescript
const subscriptions = await reevit.subscriptions.list();

subscriptions.forEach(sub => {
  console.log(`${sub.id}: ${sub.status}`);
  console.log(`  Customer: ${sub.customer_id}`);
  console.log(`  Amount: ${sub.currency} ${sub.amount / 100}/${sub.interval}`);
  console.log(`  Next renewal: ${sub.next_renewal_at}`);
});
```

---

## Fraud Protection

Configure fraud rules to protect your transactions.

### Get Fraud Policy

```typescript
const policy = await reevit.fraud.get();

console.log('Current Fraud Policy:', {
  preferredProviders: policy.prefer,
  maxAmount: policy.max_amount,
  blockedBins: policy.blocked_bins,
  allowedBins: policy.allowed_bins,
  velocityLimit: policy.velocity_max_per_minute
});
```

### Update Fraud Policy

```typescript
const updatedPolicy = await reevit.fraud.update({
  prefer: ['paystack', 'flutterwave'],
  max_amount: 500000,                    // Max 5,000.00
  blocked_bins: ['123456', '654321'],    // Block specific card BINs
  allowed_bins: [],                       // Empty = allow all (except blocked)
  velocity_max_per_minute: 10            // Max 10 transactions per minute
});

console.log('Policy updated successfully');
```

#### Fraud Policy Options

| Option | Type | Description |
|--------|------|-------------|
| `prefer` | `string[]` | Preferred provider order for routing |
| `max_amount` | `number` | Maximum transaction amount (in smallest unit) |
| `blocked_bins` | `string[]` | Card BIN prefixes to block |
| `allowed_bins` | `string[]` | Only allow these BINs (empty = allow all) |
| `velocity_max_per_minute` | `number` | Rate limit per customer |

---

## Error Handling

The SDK throws errors for failed API calls. Always wrap calls in try-catch blocks.

```typescript
import { AxiosError } from 'axios';

async function createPaymentSafely() {
  try {
    const payment = await reevit.payments.createIntent({
      amount: 5000,
      currency: 'GHS',
      method: 'momo',
      country: 'GH'
    });
    return payment;
  } catch (error) {
    if (error instanceof AxiosError) {
      // API error
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code
      });

      // Handle specific error codes
      switch (error.response?.status) {
        case 400:
          console.error('Bad request - check your parameters');
          break;
        case 401:
          console.error('Unauthorized - check your API key');
          break;
        case 403:
          console.error('Forbidden - check your permissions');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 429:
          console.error('Rate limited - slow down requests');
          break;
        case 500:
          console.error('Server error - try again later');
          break;
      }
    } else {
      // Network or other error
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

### Retry Logic Example

```typescript
import { Payment, PaymentIntentRequest } from '@reevit/node';
import { AxiosError } from 'axios';

async function createPaymentWithRetry(
  data: PaymentIntentRequest,
  maxRetries = 3,
  delayMs = 1000
): Promise<Payment> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await reevit.payments.createIntent(data);
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof AxiosError) {
        // Don't retry client errors (4xx)
        if (error.response?.status && error.response.status < 500) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}
```

---

## TypeScript Types

The SDK exports all types for use in your application.

```typescript
import {
  // Payment types
  Payment,
  PaymentSummary,
  PaymentIntentRequest,
  PaymentRouteAttempt,
  Refund,
  
  // Connection types
  Connection,
  ConnectionRequest,
  RoutingHints,
  
  // Subscription types
  Subscription,
  SubscriptionRequest,
  
  // Fraud types
  FraudPolicy,
  FraudPolicyInput
} from '@reevit/node';

// Use types in your code
function processPayment(payment: Payment): void {
  console.log(`Processing ${payment.id}`);
}

function buildPaymentRequest(): PaymentIntentRequest {
  return {
    amount: 5000,
    currency: 'GHS',
    method: 'momo',
    country: 'GH'
  };
}
```
## Supported Providers

Reevit currently supports the following payment service providers:

| Provider | Countries | Methods | Features |
|----------|-----------|---------|----------|
| **Paystack** | Nigeria, Ghana | Card, Bank Transfer, USSD | Refunds, Webhooks |
| **Flutterwave** | Nigeria, Ghana, Kenya, +30 | Card, Mobile Money, Bank | Refunds, Webhooks |
| **Hubtel** | Ghana | Mobile Money | Webhooks |
| **M-Pesa** | Kenya | M-Pesa (STK Push) | Reversals, Webhooks |
| **Monnify** | Nigeria | Bank Transfer, Card | Refunds, Webhooks |
| **Stripe** | Global | Card, Apple Pay, Google Pay | Refunds, Webhooks |

> Stripe webhooks: configure the Reevit webhook URL in Stripe; store the signing secret in the connection credentials (`stripe_webhook_secret`, `webhook_secret`, or `signing_secret`). Ensure PaymentIntent metadata includes `org_id`, `connection_id`, and `payment_id` so events map correctly.

---

## Examples

### E-commerce Checkout

```typescript
import { Reevit, Payment, PaymentIntentRequest } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!,
  process.env.REEVIT_BASE_URL
);

interface CheckoutData {
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  country: string;
  paymentMethod: string;
  customerEmail: string;
}

async function processCheckout(checkout: CheckoutData): Promise<Payment> {
  const paymentRequest: PaymentIntentRequest = {
    amount: checkout.amount,
    currency: checkout.currency,
    method: checkout.paymentMethod,
    country: checkout.country,
    customer_id: checkout.customerId,
    metadata: {
      order_id: checkout.orderId,
      customer_email: checkout.customerEmail,
      source: 'web_checkout'
    }
  };

  const payment = await reevit.payments.createIntent(paymentRequest);
  
  console.log(`Payment ${payment.id} created for order ${checkout.orderId}`);
  console.log(`Status: ${payment.status}`);
  console.log(`Provider: ${payment.provider}`);
  
  return payment;
}

// Usage
processCheckout({
  orderId: 'ORD-2024-001',
  customerId: 'cust_abc123',
  amount: 15000,  // 150.00
  currency: 'GHS',
  country: 'GH',
  paymentMethod: 'momo',
  customerEmail: 'customer@example.com'
});
```

### Subscription Service

```typescript
import { Reevit, Subscription } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!
);

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
}

const plans: Plan[] = [
  { id: 'basic', name: 'Basic', monthlyPrice: 1999, yearlyPrice: 19990, currency: 'GHS' },
  { id: 'pro', name: 'Pro', monthlyPrice: 4999, yearlyPrice: 49990, currency: 'GHS' },
  { id: 'enterprise', name: 'Enterprise', monthlyPrice: 9999, yearlyPrice: 99990, currency: 'GHS' }
];

async function subscribeToPlan(
  customerId: string,
  planId: string,
  interval: 'monthly' | 'yearly',
  paymentMethod: string
): Promise<Subscription> {
  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  const amount = interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

  const subscription = await reevit.subscriptions.create({
    customer_id: customerId,
    plan_id: planId,
    amount,
    currency: plan.currency,
    method: paymentMethod,
    interval,
    metadata: {
      plan_name: plan.name,
      billing_interval: interval
    }
  });

  console.log(`Subscription created: ${subscription.id}`);
  console.log(`Next renewal: ${subscription.next_renewal_at}`);

  return subscription;
}

// Usage
subscribeToPlan('cust_123', 'pro', 'monthly', 'momo');
```

### Multi-Provider Setup

```typescript
import { Reevit } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!
);

async function setupProviders() {
  // Primary provider for Nigeria
  await reevit.connections.create({
    provider: 'paystack',
    mode: 'live',
    credentials: {
      secret_key: process.env.PAYSTACK_SECRET_KEY!
    },
    labels: ['nigeria', 'primary'],
    routing_hints: {
      country_preference: ['NG'],
      method_bias: { card: 'high' },
      fallback_only: false
    }
  });

  // Backup provider for Nigeria
  await reevit.connections.create({
    provider: 'flutterwave',
    mode: 'live',
    credentials: {
      secret_key: process.env.FLUTTERWAVE_SECRET_KEY!,
      encryption_key: process.env.FLUTTERWAVE_ENCRYPTION_KEY!
    },
    labels: ['nigeria', 'backup'],
    routing_hints: {
      country_preference: ['NG'],
      fallback_only: true
    }
  });

  // Primary provider for Ghana
  await reevit.connections.create({
    provider: 'hubtel',
    mode: 'live',
    credentials: {
      client_id: process.env.HUBTEL_CLIENT_ID!,
      client_secret: process.env.HUBTEL_CLIENT_SECRET!
    },
    labels: ['ghana', 'momo'],
    routing_hints: {
      country_preference: ['GH'],
      method_bias: { momo: 'high' },
      fallback_only: false
    }
  });

  // Primary provider for Kenya
  await reevit.connections.create({
    provider: 'mpesa',
    mode: 'live',
    credentials: {
      consumer_key: process.env.MPESA_CONSUMER_KEY!,
      consumer_secret: process.env.MPESA_CONSUMER_SECRET!,
      passkey: process.env.MPESA_PASSKEY!,
      shortcode: process.env.MPESA_SHORTCODE!,
      initiator_name: process.env.MPESA_INITIATOR_NAME!,
      security_credential: process.env.MPESA_SECURITY_CREDENTIAL!
    },
    labels: ['kenya', 'mpesa'],
    routing_hints: {
      country_preference: ['KE'],
      method_bias: { mpesa: 'high' },
      fallback_only: false
    }
  });

  console.log('All providers configured successfully');
  
  // List all connections
  const connections = await reevit.connections.list();
  console.log(`Total connections: ${connections.length}`);
  connections.forEach(c => {
    console.log(`  - ${c.provider} (${c.mode}): ${c.status}`);
  });
}

setupProviders();
```

### Payment Status Polling

```typescript
import { Reevit, Payment } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!
);

async function waitForPaymentCompletion(
  paymentId: string,
  timeoutMs = 300000,  // 5 minutes
  pollIntervalMs = 5000
): Promise<Payment> {
  const startTime = Date.now();
  const terminalStatuses = ['succeeded', 'failed', 'canceled'];

  while (Date.now() - startTime < timeoutMs) {
    const payment = await reevit.payments.get(paymentId);
    
    console.log(`Payment ${paymentId}: ${payment.status}`);

    if (terminalStatuses.includes(payment.status)) {
      return payment;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Payment ${paymentId} did not complete within ${timeoutMs}ms`);
}

// Usage
async function processAndWait() {
  const payment = await reevit.payments.createIntent({
    amount: 5000,
    currency: 'GHS',
    method: 'momo',
    country: 'GH'
  });

  console.log(`Created payment: ${payment.id}`);

  const completedPayment = await waitForPaymentCompletion(payment.id);
  
  if (completedPayment.status === 'succeeded') {
    console.log('Payment successful!');
    console.log(`Net amount: ${completedPayment.net_amount}`);
  } else {
    console.log(`Payment ${completedPayment.status}`);
  }
}
```

### Refund Management

```typescript
import { Reevit, Payment, Refund } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!
);

interface RefundRequest {
  paymentId: string;
  amount?: number;  // Optional for partial refund
  reason: string;
}

async function processRefund(request: RefundRequest): Promise<Refund> {
  // First, verify the payment exists and is refundable
  const payment = await reevit.payments.get(request.paymentId);
  
  if (payment.status !== 'succeeded') {
    throw new Error(`Cannot refund payment with status: ${payment.status}`);
  }

  // Validate refund amount
  const refundAmount = request.amount || payment.amount;
  if (refundAmount > payment.amount) {
    throw new Error(`Refund amount (${refundAmount}) exceeds payment amount (${payment.amount})`);
  }

  // Process the refund
  const refund = await reevit.payments.refund(
    request.paymentId,
    request.amount,
    request.reason
  );

  console.log(`Refund processed: ${refund.id}`);
  console.log(`  Amount: ${refund.amount}`);
  console.log(`  Status: ${refund.status}`);
  console.log(`  Reason: ${refund.reason}`);

  return refund;
}

// Full refund
processRefund({
  paymentId: 'pay_abc123',
  reason: 'Customer requested cancellation'
});

// Partial refund
processRefund({
  paymentId: 'pay_abc123',
  amount: 2500,  // Refund 25.00
  reason: 'Partial order cancellation'
});
```

### Express.js Integration

```typescript
import express from 'express';
import { Reevit, PaymentIntentRequest } from '@reevit/node';

const app = express();
app.use(express.json());

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!,
  process.env.REEVIT_BASE_URL
);

// Create payment endpoint
app.post('/api/payments', async (req, res) => {
  try {
    const { amount, currency, method, country, customerId, orderId } = req.body;

    const payment = await reevit.payments.createIntent({
      amount,
      currency,
      method,
      country,
      customer_id: customerId,
      metadata: { order_id: orderId }
    });

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        provider: payment.provider
      }
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

// Get payment status endpoint
app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await reevit.payments.get(req.params.id);
    res.json({ success: true, payment });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

// Refund endpoint
app.post('/api/payments/:id/refund', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const refund = await reevit.payments.refund(req.params.id, amount, reason);
    res.json({ success: true, refund });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Next.js API Routes

```typescript
// pages/api/payments/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Reevit } from '@reevit/node';

const reevit = new Reevit(
  process.env.REEVIT_API_KEY!,
  process.env.REEVIT_ORG_ID!,
  process.env.REEVIT_BASE_URL
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency, method, country, customerId } = req.body;

    const payment = await reevit.payments.createIntent({
      amount,
      currency,
      method,
      country,
      customer_id: customerId
    });

    res.status(200).json({ payment });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
}
```

---

## Webhook Verification

Reevit sends webhooks to notify your application of payment events. Always verify webhook signatures to ensure authenticity.

### Understanding Webhooks

There are **two types of webhooks** in Reevit:

1. **Inbound Webhooks (PSP → Reevit)**: Webhooks from payment providers to Reevit. You configure these in the PSP dashboard (e.g., Paystack). Reevit handles these automatically.

2. **Outbound Webhooks (Reevit → Your App)**: Webhooks from Reevit to your application. You configure these in the Reevit Dashboard and create a handler in your app.

### Signature Format

Reevit signs webhooks with HMAC-SHA256:
- **Header**: `X-Reevit-Signature: sha256=<hex-signature>`
- **Signature**: `HMAC-SHA256(request_body, signing_secret)`

### Getting Your Signing Secret

1. Go to **Reevit Dashboard > Developers > Webhooks**
2. Configure your webhook endpoint URL
3. Copy the signing secret (starts with `whsec_`)
4. Add to your environment: `REEVIT_WEBHOOK_SECRET=whsec_xxx...`

### Next.js App Router Webhook Handler

```typescript
// app/api/webhooks/reevit/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Webhook payload types
interface PaymentData {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  customer_id?: string;
  metadata?: Record<string, string>;
}

interface SubscriptionData {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  next_renewal_at?: string;
}

interface WebhookPayload {
  id: string;
  type: string;
  org_id: string;
  created_at: string;
  data?: PaymentData | SubscriptionData;
  message?: string;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * Always verify signatures in production to prevent spoofed webhooks
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  const received = signature.slice(7);
  if (received.length !== expected.length) return false;
  
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-reevit-signature") || "";
    const secret = process.env.REEVIT_WEBHOOK_SECRET;

    // Verify signature (required in production)
    if (secret && !verifySignature(rawBody, signature, secret)) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: WebhookPayload = JSON.parse(rawBody);
    console.log(`[Webhook] Received: ${event.type} (${event.id})`);

    // Handle different event types
    switch (event.type) {
      // Test event
      case "reevit.webhook.test":
        console.log("[Webhook] Test received:", event.message);
        break;

      // Payment events
      case "payment.succeeded":
        await handlePaymentSucceeded(event.data as PaymentData);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.data as PaymentData);
        break;

      case "payment.refunded":
        await handlePaymentRefunded(event.data as PaymentData);
        break;

      case "payment.pending":
        console.log(`[Webhook] Payment pending: ${(event.data as PaymentData)?.id}`);
        break;

      // Subscription events
      case "subscription.created":
        await handleSubscriptionCreated(event.data as SubscriptionData);
        break;

      case "subscription.renewed":
        await handleSubscriptionRenewed(event.data as SubscriptionData);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data as SubscriptionData);
        break;

      case "subscription.paused":
        console.log(`[Webhook] Subscription paused: ${(event.data as SubscriptionData)?.id}`);
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Payment handlers
async function handlePaymentSucceeded(data: PaymentData) {
  const orderId = data.metadata?.order_id;
  console.log(`[Webhook] Payment succeeded: ${data.id} for order ${orderId}`);
  
  // TODO: Implement your business logic
  // - Update order status to "paid"
  // - Send confirmation email to customer
  // - Trigger fulfillment process
  // - Update inventory
}

async function handlePaymentFailed(data: PaymentData) {
  console.log(`[Webhook] Payment failed: ${data.id}`);
  
  // TODO: Implement your business logic
  // - Update order status to "payment_failed"
  // - Send notification to customer
  // - Allow retry
}

async function handlePaymentRefunded(data: PaymentData) {
  const orderId = data.metadata?.order_id;
  console.log(`[Webhook] Payment refunded: ${data.id} for order ${orderId}`);
  
  // TODO: Implement your business logic
  // - Update order status to "refunded"
  // - Restore inventory if applicable
  // - Send refund confirmation email
}

// Subscription handlers
async function handleSubscriptionCreated(data: SubscriptionData) {
  console.log(`[Webhook] Subscription created: ${data.id} for customer ${data.customer_id}`);
  
  // TODO: Implement your business logic
  // - Grant access to subscription features
  // - Send welcome email
}

async function handleSubscriptionRenewed(data: SubscriptionData) {
  console.log(`[Webhook] Subscription renewed: ${data.id}`);
  
  // TODO: Implement your business logic
  // - Extend access period
  // - Send renewal confirmation
}

async function handleSubscriptionCanceled(data: SubscriptionData) {
  console.log(`[Webhook] Subscription canceled: ${data.id}`);
  
  // TODO: Implement your business logic
  // - Revoke access at end of billing period
  // - Send cancellation confirmation
}
```

### Express.js Webhook Handler

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const received = signature.slice(7);
  if (received.length !== expected.length) return false;
  
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// IMPORTANT: Use raw body for signature verification
app.post('/webhooks/reevit', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-reevit-signature'] as string;
    const payload = req.body.toString();
    const secret = process.env.REEVIT_WEBHOOK_SECRET!;

    if (secret && !verifySignature(payload, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    console.log(`[Webhook] Received: ${event.type}`);

    switch (event.type) {
      case 'reevit.webhook.test':
        console.log('[Webhook] Test received:', event.message);
        break;
      case 'payment.succeeded':
        // Fulfill order, send confirmation email
        break;
      case 'payment.failed':
        // Notify customer, allow retry
        break;
      case 'payment.refunded':
        // Update order status
        break;
      case 'subscription.renewed':
        // Extend access
        break;
      case 'subscription.canceled':
        // Revoke access
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Environment Variables

```bash
# .env.local
REEVIT_API_KEY=pfk_live_xxx
REEVIT_ORG_ID=org_xxx
REEVIT_WEBHOOK_SECRET=whsec_xxx  # Get from Dashboard > Developers > Webhooks
```

---

## Support

- **Documentation**: [https://docs.reevit.io](https://docs.reevit.io)
- **API Reference**: [https://api.reevit.io/docs](https://api.reevit.io/docs)
- **GitHub Issues**: [https://github.com/reevit/reevit-node/issues](https://github.com/reevit/reevit-node/issues)
- **Email**: support@reevit.io

## License

MIT License - see [LICENSE](LICENSE) for details.
