import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Reevit, isReevitAPIError } from '../dist/index.js';

const policy = { max_amount: 5000, blocked_bins: ['400000'], allowed_bins: [], velocity_max_per_minute: 5 };

async function withPolicyEndpoint(run) {
  const seen = [];
  const server = http.createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = body ? JSON.parse(body) : undefined;
    seen.push({ method: request.method, path: request.url, key: request.headers['idempotency-key'], payload });
    response.setHeader('content-type', 'application/json');
    if (request.method === 'POST' && !request.headers['idempotency-key']) {
      response.writeHead(400);
      response.end(JSON.stringify({ code: 'missing_idempotency_key', message: 'Idempotency-Key header is required' }));
    } else {
      response.writeHead(request.method === 'POST' ? 201 : 200);
      response.end(JSON.stringify({ ...(payload || policy), org_id: 'org_fixture', mode: 'sandbox' }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const client = new Reevit('pfk_test_fixture', 'org_fixture', `http://127.0.0.1:${server.address().port}`);
    await run(client, seen);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('fraud policy updates preserve operation key and body across retries', async () => {
  await withPolicyEndpoint(async (client, seen) => {
    const options = { idempotencyKey: 'fraud-policy:revision_2' };
    const first = await client.fraud.update(policy, options);
    const retry = await client.fraud.update(policy, options);
    assert.deepEqual(first, retry);
    assert.deepEqual(seen[0], seen[1]);
    assert.equal(seen[0].path, '/v1/policies/fraud');
    assert.equal(seen[0].key, options.idempotencyKey);
    assert.deepEqual(seen[0].payload, policy);
  });
});

test('legacy preferences and GET metadata do not reach the closed policy decoder', async () => {
  await withPolicyEndpoint(async (client, seen) => {
    const legacy = { ...policy, prefer: ['paystack'], org_id: 'org_fixture', mode: 'sandbox', updated_at: '2026-10-04T00:00:00Z' };
    await client.fraud.update(legacy, { idempotencyKey: 'fraud-policy:legacy-revision' });
    assert.deepEqual(seen[0].payload, policy);
    assert.deepEqual(legacy.prefer, ['paystack'], 'calling update does not mutate the caller payload');
  });
});

test('the optional request-options argument preserves the one-argument call convention', async () => {
  await withPolicyEndpoint(async (client, seen) => {
    await assert.rejects(client.fraud.update(policy), error => isReevitAPIError(error) && error.status === 400 && error.code === 'missing_idempotency_key');
    assert.equal(seen[0].key, undefined);
    assert.deepEqual(seen[0].payload, policy);
  });
});

test('fraud policy reads retain response metadata without a mutation key', async () => {
  await withPolicyEndpoint(async (client, seen) => {
    const result = await client.fraud.get();
    assert.equal(result.max_amount, 5000);
    assert.equal(result.mode, 'sandbox');
    assert.equal(seen[0].method, 'GET');
    assert.equal(seen[0].key, undefined);
    assert.equal(seen[0].payload, undefined);
  });
});
