import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Webhook signature verification for Reevit outbound webhooks.
 *
 * Reevit signs every outbound webhook with HMAC-SHA256 over the **raw request
 * body** and sends the result in the `X-Reevit-Signature` header as
 * `sha256=<hex>`. The signed body includes a `signature_timestamp` field, so the
 * signature also covers the timestamp (tamper protection). To additionally guard
 * against replay of a captured-but-recent delivery, check that
 * `signature_timestamp` is recent after the signature verifies.
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
