// Webhook signature verification tests. Runs against the compiled output with
// the Node built-in test runner: `npm run build && node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { signWebhookPayload, verifyWebhookSignature } from '../dist/index.js';

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
