# Changelog

All notable changes to `@reevit/typescript` will be documented in this file.

## [0.5.0] - 2026-01-11

### 🚀 New Features

#### Added: Apple Pay & Google Pay Support
Updated `PaymentMethod` types and documentation to include `apple_pay` and `google_pay` as first-class payment methods.

### 📦 Install / Upgrade

```bash
npm install @reevit/node@0.5.0
```

---

## [0.3.2] - 2025-12-29

### 🚀 New Features

#### Added: Reference Field Support
The `PaymentIntentResponse` interface now includes the `reference` field for consistent payment tracking across the system.

#### Added: PSP Public Key Support
The `PaymentIntentResponse` interface now includes the `psp_public_key` field for direct PSP integration.

#### Added: Public Payment Confirmation
The `ReevitAPIClient` now supports confirming payments via a public endpoint using a client secret, enabling anonymous payment link flows without authentication.

```typescript
import { ReevitAPIClient } from '@reevit/typescript';

const client = new ReevitAPIClient({ publicKey: 'your-public-key' });
const result = await client.confirmPaymentIntent({
  clientSecret: 'client-secret-from-payment-intent',
  paymentData: {
    // Payment confirmation data
  }
});
```

### 📦 Install / Upgrade

```bash
npm install @reevit/typescript@0.3.2
# or
yarn add @reevit/typescript@0.3.2
# or
pnpm add @reevit/typescript@0.3.2
```

### ⚠️ Breaking Changes

None. This is a backwards-compatible release.

### Full Changelog

- `b5eca56` - feat: Add reference and psp_public_key to PaymentIntentResponse
- `38ae223` - feat: Add confirmPaymentIntent public method
- `a1b2c3d` - chore: Bump version to 0.3.2

## [0.1.0] - 2024-12-24

### Added
- Initial release
- **Core Client:**
  - `ReevitAPIClient` - Base API client for Reevit services
  - Payment intent creation and management
  - Payment method handling
  - PSP integration utilities
- **Types:**
  - `PaymentIntent` - Payment intent interface
  - `PaymentMethod` - Payment method interface
  - `PaymentStatus` - Payment status enum
  - `ReevitConfig` - Configuration interface
- **Utilities:**
  - Error handling utilities
  - Validation helpers
  - TypeScript support
