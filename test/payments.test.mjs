import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { Reevit } from '../dist/index.js';

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function captureQuery(seen) {
  return (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    seen.push(Object.fromEntries(url.searchParams.entries()));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ payments: [{ id: 'pay_1' }] }));
  };
}

test('payments.list accepts an options object', async () => {
  const seen = [];
  await withServer(captureQuery(seen), async (baseUrl) => {
    const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
    const payments = await client.payments.list({
      limit: 100,
      offset: 200,
      status: 'succeeded',
      customer_id: 'cus_1',
    });
    assert.deepEqual(payments, [{ id: 'pay_1' }]);
  });
  assert.deepEqual(seen[0], {
    limit: '100',
    offset: '200',
    status: 'succeeded',
    customer_id: 'cus_1',
  });
});

test('payments.list still accepts the deprecated positional pair', async () => {
  const seen = [];
  await withServer(captureQuery(seen), async (baseUrl) => {
    const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
    await client.payments.list(25, 75);
    await client.payments.list(10);
  });
  assert.deepEqual(seen[0], { limit: '25', offset: '75' });
  assert.deepEqual(seen[1], { limit: '10', offset: '0' });
});

test('payments.list defaults to limit=50 offset=0 with no arguments', async () => {
  const seen = [];
  await withServer(captureQuery(seen), async (baseUrl) => {
    const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
    await client.payments.list();
  });
  assert.deepEqual(seen[0], { limit: '50', offset: '0' });
});
