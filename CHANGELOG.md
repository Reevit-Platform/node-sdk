# Changelog

All notable changes to `@reevit/node` will be documented in this file.

## [0.10.2] - 2026-08-14

### Fixed

- List responses are forward-compatible with the list envelope.

## [0.10.1] - 2026-08-14

### Changed

- The bundled OpenAPI contract exposes the checkout reference.

## [Unreleased]

### Added

- `constructEvent(rawBody, signature, secret, { toleranceSeconds, now })` —
  verifies the signature, enforces the `signature_timestamp` replay window
  (300s by default, both directions), parses the body and returns a
  `ReevitWebhookEvent` union discriminated on `event`. Unknown event types fall
  through to a generic shape. `verifyWebhookSignatureWithTolerance` is the
  boolean variant.
- `payments.list()` now accepts a `PaymentListOptions` object
  (`{ limit, offset, status, customer_id, provider, ... }`), matching every
  other list method. The positional `(limit, offset)` form still works and is
  marked `@deprecated`.
- `extractPage` and `tryExtractArray` helpers alongside `extractArray`.

### Fixed

- `payouts.list()`, `payouts.listBeneficiaries()` and `payouts.balance()` were
  left out of the list-envelope migration. `balance()` in particular did
  `response.data.balances` with no guard — an unhandled `TypeError` on the
  money-out surface the day the `{ data, pagination }` envelope ships. All
  three now read every supported shape.
- Percent-encode every interpolated path segment across the service classes
  (only `connections.ts` did before), so an id containing `/` or `?` can no
  longer rewrite the route or smuggle a query string.

### Changed

- **Behaviour change** — an unrecognised list-response shape now raises
  `ReevitAPIError` with code `unexpected_response_shape` instead of returning
  `[]`. A silent `[]` was indistinguishable from "this merchant has no
  records", which would make a reconciliation or dunning sweep process nothing
  and report success. A recognised-but-empty container, and an absent body
  (204), still return `[]`.
- **Behaviour change** — the four bare `throw new Error` sites (three
  `connections.ts` shape guards and the `payouts` idempotency-key guard) now
  throw `ReevitAPIError` with codes `unexpected_response_shape` and
  `missing_idempotency_key`, so the documented
  `catch (e) { if (isReevitAPIError(e)) ... }` pattern actually catches them.
  Code that matched on `error.message` is unaffected; code that checked
  `error.constructor === Error` is not.

- Derive the `User-Agent` and `X-Reevit-Client-Version` headers from
  `package.json` via a generated `src/version.ts`, so requests report the real
  package version instead of a hard-coded `0.9.0`.
- Declare `engines.node >= 18` and an `exports` map (CommonJS only).
- Bump `axios` to 1.20.0 within the existing `^1.4.0` range, clearing two high
  advisories (axios prototype pollution, `form-data` CRLF injection). CI and the
  publish workflow now fail on high advisories in runtime dependencies instead
  of reporting them with `|| true`.
- Bump the `@types/node` devDependency to `^22` to match the Node versions CI runs.
- Import `node:crypto` rather than the bare `crypto` specifier in the webhook helpers.

### Removed

- Drop the unused, divergent `src/client.ts` (`ReevitAPIClient`), which nothing
  imported but which was compiled into every publish, and the unused
  `isSandboxKey` helper in `src/index.ts`.
- Drop `dom` from the TypeScript `lib` list; this package is Node-only.


## [0.10.0] - 2026-07-25

### Added

- Add payout resources.
- Add paginated and automatic fetch-all merchant connection methods.
- Add connection filters, label discovery, and complete response fields.

### Fixed

- Read credential-test success from the backend `ok` field.
- Reject malformed wrapped connection-list responses.

### Changed

- Added `repository`, `homepage` and `bugs` to `package.json`.
- Publishing moved to npm OIDC trusted publishing on a GitHub-hosted runner.

## [0.9.0] - 2026-07-13

### Added

- Checkout sessions: a `checkoutSessions` service, checkout-session types and
  the bundled OpenAPI contract.
- Webhook signature verification helpers.

### Changed

- CI workflows migrated to Blacksmith runners.

## [0.8.1] - 2026-03-13

### Added

- Service-oriented client surface: customers, invoices, payment links, routing
  rules, webhooks and shared utils services, alongside expanded connections,
  payments and subscriptions services.

## [0.8.0] - 2026-03-03

### Added

- `provider_ref_id` on the payment intent response types.

## [0.7.0] - 2026-02-07

### 🛠 Improvements

- Added `idempotencyKey` support for payment intent creation.

> There was no `0.6.0` release of this package; the manifest went from `0.5.0`
> straight to `0.7.0`.

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
