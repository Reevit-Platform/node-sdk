// Webhook signature verification tests. Runs against the compiled output with
// the Node built-in test runner: `npm run build && node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  constructEvent,
  isReevitAPIError,
  signWebhookPayload,
  verifyWebhookSignature,
  verifyWebhookSignatureWithTolerance,
} from '../dist/index.js';

// Canonical known-answer vector shared across the Node, Python and PHP SDK
// tests. HMAC-SHA256(secret, body) hex, prefixed with "sha256=" -- exactly what
// the Go backend emits in the X-Reevit-Signature header.
const SECRET = 'whsec_test_2x9aBcDeFgHiJkLmNoPqRsTuVwXyZ012';
const BODY =
  '{"event":"payment.updated","org_id":"org_123","signature_timestamp":"2026-06-13T12:00:00Z","data":{"id":"pay_abc","status":"succeeded"}}';
const EXPECTED_SIG = 'sha256=8fed6e24bd1c97ac5634ec88081a8299107706bf488290513bc3e5c5340e1950';

test('sign matches known vector', () => {
  assert.equal(signWebhookPayload(BODY, SECRET), EXPECTED_SIG);
});

test('sign accepts a Buffer body', () => {
  assert.equal(signWebhookPayload(Buffer.from(BODY, 'utf8'), SECRET), EXPECTED_SIG);
});

test('verify accepts a valid signature', () => {
  assert.equal(verifyWebhookSignature(BODY, EXPECTED_SIG, SECRET), true);
});

test('verify rejects a tampered body', () => {
  const tampered = BODY.replace('succeeded', 'failed');
  assert.equal(verifyWebhookSignature(tampered, EXPECTED_SIG, SECRET), false);
});

test('verify rejects the wrong secret', () => {
  assert.equal(verifyWebhookSignature(BODY, EXPECTED_SIG, 'whsec_wrong'), false);
});

test('verify rejects missing or empty inputs', () => {
  assert.equal(verifyWebhookSignature(BODY, undefined, SECRET), false);
  assert.equal(verifyWebhookSignature(BODY, '', SECRET), false);
  assert.equal(verifyWebhookSignature(BODY, EXPECTED_SIG, ''), false);
});

test('verify rejects a signature without the sha256= prefix', () => {
  const bare = EXPECTED_SIG.slice('sha256='.length);
  assert.equal(verifyWebhookSignature(BODY, bare, SECRET), false);
});

// The instant BODY's signature_timestamp claims, plus a minute. Every
// tolerance assertion below is anchored to the same cross-language vector, so
// this SDK and the Go/Python/PHP ones agree byte for byte.
const SIGNED_AT = Date.parse('2026-06-13T12:00:00Z');
const JUST_AFTER = new Date(SIGNED_AT + 60_000);

function rejects(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(isReevitAPIError(error), `expected a ReevitAPIError, got ${error}`);
    assert.equal(error.code, code);
    return true;
  });
}

test('constructEvent parses the cross-language vector inside the window', () => {
  const event = constructEvent(BODY, EXPECTED_SIG, SECRET, { now: JUST_AFTER });
  assert.equal(event.event, 'payment.updated');
  assert.equal(event.org_id, 'org_123');
  assert.equal(event.signature_timestamp, '2026-06-13T12:00:00Z');
  assert.deepEqual(event.data, { id: 'pay_abc', status: 'succeeded' });
});

test('constructEvent accepts a Buffer body', () => {
  const event = constructEvent(Buffer.from(BODY, 'utf8'), EXPECTED_SIG, SECRET, {
    now: JUST_AFTER,
  });
  assert.equal(event.event, 'payment.updated');
});

test('constructEvent rejects a bad signature before parsing', () => {
  rejects(() => constructEvent(BODY, EXPECTED_SIG, 'whsec_wrong', { now: JUST_AFTER }),
    'invalid_webhook_signature');
  rejects(() => constructEvent(BODY, undefined, SECRET, { now: JUST_AFTER }),
    'invalid_webhook_signature');
  rejects(
    () => constructEvent(BODY.replace('succeeded', 'failed'), EXPECTED_SIG, SECRET, { now: JUST_AFTER }),
    'invalid_webhook_signature',
  );
});

test('constructEvent enforces the replay window in both directions', () => {
  // 301s late and 301s early: both outside the 300s default.
  rejects(
    () => constructEvent(BODY, EXPECTED_SIG, SECRET, { now: new Date(SIGNED_AT + 301_000) }),
    'webhook_timestamp_out_of_tolerance',
  );
  rejects(
    () => constructEvent(BODY, EXPECTED_SIG, SECRET, { now: new Date(SIGNED_AT - 301_000) }),
    'webhook_timestamp_out_of_tolerance',
  );

  // 299s late is inside it.
  assert.equal(
    constructEvent(BODY, EXPECTED_SIG, SECRET, { now: new Date(SIGNED_AT + 299_000) }).event,
    'payment.updated',
  );
});

test('constructEvent honours a custom tolerance and toleranceSeconds: 0', () => {
  rejects(
    () => constructEvent(BODY, EXPECTED_SIG, SECRET, { now: new Date(SIGNED_AT + 61_000), toleranceSeconds: 60 }),
    'webhook_timestamp_out_of_tolerance',
  );

  // 0 disables the check entirely, so a year-old delivery still parses.
  assert.equal(
    constructEvent(BODY, EXPECTED_SIG, SECRET, { toleranceSeconds: 0, now: new Date(SIGNED_AT + 31_536_000_000) }).event,
    'payment.updated',
  );
});

test('constructEvent rejects a signed body with no signature_timestamp', () => {
  const body = '{"event":"payment.updated","data":{}}';
  rejects(
    () => constructEvent(body, signWebhookPayload(body, SECRET), SECRET, { now: JUST_AFTER }),
    'missing_signature_timestamp',
  );

  const bad = '{"event":"payment.updated","signature_timestamp":"not-a-date"}';
  rejects(
    () => constructEvent(bad, signWebhookPayload(bad, SECRET), SECRET, { now: JUST_AFTER }),
    'invalid_signature_timestamp',
  );
});

test('constructEvent rejects a correctly signed non-object body', () => {
  for (const body of ['not json at all', '[1,2,3]']) {
    rejects(
      () => constructEvent(body, signWebhookPayload(body, SECRET), SECRET, { now: JUST_AFTER }),
      'invalid_webhook_payload',
    );
  }
});

test('constructEvent passes unknown event types through unchanged', () => {
  const body = '{"event":"widget.exploded","signature_timestamp":"2026-06-13T12:00:00Z","data":{"id":"w_1"}}';
  const event = constructEvent(body, signWebhookPayload(body, SECRET), SECRET, { now: JUST_AFTER });
  assert.equal(event.event, 'widget.exploded');
  assert.deepEqual(event.data, { id: 'w_1' });
});

test('verifyWebhookSignatureWithTolerance returns booleans, not throws', () => {
  assert.equal(
    verifyWebhookSignatureWithTolerance(BODY, EXPECTED_SIG, SECRET, { now: JUST_AFTER }),
    true,
  );
  assert.equal(
    verifyWebhookSignatureWithTolerance(BODY, EXPECTED_SIG, SECRET, {
      now: new Date(SIGNED_AT + 301_000),
    }),
    false,
  );
  assert.equal(
    verifyWebhookSignatureWithTolerance(BODY, EXPECTED_SIG, 'whsec_wrong', { now: JUST_AFTER }),
    false,
  );
  assert.equal(
    verifyWebhookSignatureWithTolerance(BODY, EXPECTED_SIG, SECRET, {
      toleranceSeconds: 0,
      now: new Date(SIGNED_AT + 31_536_000_000),
    }),
    true,
  );
});
