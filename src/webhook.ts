import { createHmac, timingSafeEqual } from 'node:crypto';
import { ReevitAPIError } from './errors';

/**
 * Webhook signature verification for Reevit outbound webhooks.
 *
 * Reevit signs every outbound webhook with HMAC-SHA256 over the **raw request
 * body** and sends the result in the `X-Reevit-Signature` header as
 * `sha256=<hex>`. The signed body includes a `signature_timestamp` field, so the
 * signature also covers the timestamp (tamper protection). To additionally guard
 * against replay of a captured-but-recent delivery, the `signature_timestamp`
 * must also be recent — use `constructEvent` or
 * `verifyWebhookSignatureWithTolerance`, which do that for you.
 *
 * IMPORTANT: verify against the exact bytes you received. Do not `JSON.parse`
 * and re-`JSON.stringify` the body first — key order and whitespace must match
 * what Reevit signed, or the signature will not match.
 */

const SIGNATURE_PREFIX = 'sha256=';

function toBuffer(payload: string | Buffer): Buffer {
  return typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
}

/**
 * Computes the `X-Reevit-Signature` header value for a raw webhook body.
 * Returns `sha256=<hex HMAC-SHA256 of the body>`. Primarily useful for tests.
 */
export function signWebhookPayload(payload: string | Buffer, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(toBuffer(payload));
  return SIGNATURE_PREFIX + hmac.digest('hex');
}

/**
 * Verifies a Reevit webhook signature in constant time.
 *
 * @param payload   Raw request body, exactly as received (string or Buffer).
 * @param signature The `X-Reevit-Signature` header value (`sha256=...`).
 * @param secret    The signing secret for the webhook endpoint.
 * @returns `true` only if the signature is present and valid.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined | null,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expected = Buffer.from(signWebhookPayload(payload, secret), 'utf8');
  const received = Buffer.from(signature, 'utf8');

  // timingSafeEqual requires equal-length buffers; an unequal length is already
  // a mismatch, so bail before it throws. The expected length is fixed
  // ("sha256=" + 64 hex chars), so this length check leaks nothing useful.
  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

/** Default replay window: a delivery signed more than 5 minutes ago is rejected. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

export interface WebhookToleranceOptions {
  /**
   * Maximum age (and future skew) in seconds for the signed
   * `signature_timestamp`. Set to `0` to skip the timestamp check entirely.
   */
  toleranceSeconds?: number;
  /** Clock override; defaults to `new Date()`. Useful in tests. */
  now?: Date | number;
}

/**
 * Fields Reevit's outbound dispatcher adds to every signed delivery.
 *
 * NOTE: the event name is carried in `event`, not `type`. Some older
 * documentation shows `type`; the dispatcher has always emitted `event`.
 * `onboarding.*` deliveries are the one exception — they ship a bare payload
 * with no envelope, so `event` is absent and they resolve to
 * `UnknownWebhookEvent`.
 */
export interface WebhookEventEnvelope {
  org_id?: string;
  timestamp?: string;
  api_version?: string;
  /** RFC 3339 instant the delivery was signed. Added by the dispatcher. */
  signature_timestamp?: string;
  delivery_id?: string;
  attempt?: number;
  mode?: string;
  [key: string]: any;
}

export interface PaymentWebhookEvent extends WebhookEventEnvelope {
  event:
    | 'payment.created'
    | 'payment.updated'
    | 'payment.expired'
    | 'payment.canceled'
    | 'payment.disputed';
  data?: Record<string, any>;
}

export interface RefundWebhookEvent extends WebhookEventEnvelope {
  event: 'refund.succeeded' | 'refund.failed' | 'refund.updated';
  data?: Record<string, any>;
}

export interface DisputeWebhookEvent extends WebhookEventEnvelope {
  event: 'dispute.evidence_due';
  data?: Record<string, any>;
}

export interface ReconciliationWebhookEvent extends WebhookEventEnvelope {
  event: 'reconciliation.mismatch';
  data?: Record<string, any>;
}

export interface ApiKeyWebhookEvent extends WebhookEventEnvelope {
  event: 'api_key.created' | 'api_key.revoked' | 'api_key.rotated' | 'api_key.deleted';
  data?: Record<string, any>;
}

export interface OnboardingWebhookEvent extends WebhookEventEnvelope {
  event:
    | 'onboarding.started'
    | 'onboarding.submitted'
    | 'onboarding.approved'
    | 'onboarding.rejected';
  data?: Record<string, any>;
}

/** Sent by `Notifier.SubscriptionPaused`, which uses its own envelope. */
export interface SubscriptionPausedWebhookEvent extends WebhookEventEnvelope {
  event: 'subscription.paused';
  subscription?: Record<string, any>;
  invoice?: Record<string, any>;
}

/** Sent by the "send test webhook" button; carries `message` instead of `data`. */
export interface TestWebhookEvent extends WebhookEventEnvelope {
  event: 'reevit.webhook.test';
  message?: string;
}

/**
 * Any delivery whose `event` this SDK version does not know — including
 * `onboarding.*`, which ships without an envelope. Handle it in the `default`
 * branch rather than throwing: new event types are added server-side without
 * an SDK release.
 */
export interface UnknownWebhookEvent extends WebhookEventEnvelope {
  event?: string;
  data?: Record<string, any>;
}

export type ReevitWebhookEvent =
  | PaymentWebhookEvent
  | RefundWebhookEvent
  | DisputeWebhookEvent
  | ReconciliationWebhookEvent
  | ApiKeyWebhookEvent
  | OnboardingWebhookEvent
  | SubscriptionPausedWebhookEvent
  | TestWebhookEvent
  | UnknownWebhookEvent;

function resolveNow(now?: Date | number): number {
  if (now === undefined) {
    return Date.now();
  }
  return now instanceof Date ? now.getTime() : now;
}

/**
 * Verifies the signature **and** the replay window in one call.
 *
 * Reads `signature_timestamp` out of the signed body (the signature covers it,
 * so it cannot be tampered with) and requires it to be within
 * `toleranceSeconds` of now, in either direction — the future side covers clock
 * skew between your host and Reevit's.
 *
 * @returns `true` only if the signature is valid and the timestamp is in window.
 */
export function verifyWebhookSignatureWithTolerance(
  payload: string | Buffer,
  signature: string | undefined | null,
  secret: string,
  options: WebhookToleranceOptions = {},
): boolean {
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return false;
  }

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (tolerance <= 0) {
    return true;
  }

  let body: unknown;
  try {
    body = JSON.parse(toBuffer(payload).toString('utf8'));
  } catch {
    return false;
  }

  return timestampWithinTolerance(body, tolerance, resolveNow(options.now)) === null;
}

/**
 * Returns `null` when the signed timestamp is present and in window, or a
 * description of what is wrong with it.
 */
function timestampWithinTolerance(
  body: unknown,
  toleranceSeconds: number,
  nowMs: number,
): { code: string; message: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      code: 'invalid_webhook_payload',
      message: 'webhook payload is not a JSON object',
    };
  }

  const raw = (body as Record<string, unknown>)['signature_timestamp'];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {
      code: 'missing_signature_timestamp',
      message:
        'webhook payload has no signature_timestamp; pass toleranceSeconds: 0 to skip the replay check',
    };
  }

  const signedAtMs = Date.parse(raw);
  if (Number.isNaN(signedAtMs)) {
    return {
      code: 'invalid_signature_timestamp',
      message: `signature_timestamp is not an RFC 3339 instant: ${raw}`,
    };
  }

  const driftSeconds = Math.abs(nowMs - signedAtMs) / 1000;
  if (driftSeconds > toleranceSeconds) {
    return {
      code: 'webhook_timestamp_out_of_tolerance',
      message:
        `signature_timestamp ${raw} is ${Math.round(driftSeconds)}s away from now, ` +
        `outside the ${toleranceSeconds}s tolerance`,
    };
  }

  return null;
}

/**
 * Verifies, replay-checks and parses a webhook delivery in one call.
 *
 * This is the handler you want: it does what `verifyWebhookSignature` does,
 * then enforces the replay window the signed `signature_timestamp` exists for,
 * then parses the body into a discriminated union you can `switch` on.
 *
 * ```ts
 * const event = constructEvent(rawBody, request.headers['x-reevit-signature'], secret);
 * switch (event.event) {
 *   case 'payment.updated':
 *     return handlePayment(event.data);
 *   default:
 *     return; // unknown event types are not an error
 * }
 * ```
 *
 * @param rawBody   Raw request body, exactly as received. Do not re-serialize.
 * @param signature The `X-Reevit-Signature` header value (`sha256=...`).
 * @param secret    The signing secret for the webhook endpoint.
 * @throws {ReevitAPIError} `invalid_webhook_signature`, `invalid_webhook_payload`,
 *   `missing_signature_timestamp`, `invalid_signature_timestamp` or
 *   `webhook_timestamp_out_of_tolerance`.
 */
export function constructEvent(
  rawBody: string | Buffer,
  signature: string | undefined | null,
  secret: string,
  options: WebhookToleranceOptions = {},
): ReevitWebhookEvent {
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new ReevitAPIError('webhook signature verification failed', {
      code: 'invalid_webhook_signature',
      status: 0,
      recoverable: false,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(toBuffer(rawBody).toString('utf8'));
  } catch (cause) {
    throw new ReevitAPIError('webhook payload is not valid JSON', {
      code: 'invalid_webhook_payload',
      status: 0,
      recoverable: false,
      cause,
    });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ReevitAPIError('webhook payload is not a JSON object', {
      code: 'invalid_webhook_payload',
      status: 0,
      recoverable: false,
    });
  }

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (tolerance > 0) {
    const problem = timestampWithinTolerance(body, tolerance, resolveNow(options.now));
    if (problem) {
      throw new ReevitAPIError(problem.message, {
        code: problem.code,
        status: 0,
        recoverable: false,
      });
    }
  }

  return body as ReevitWebhookEvent;
}
