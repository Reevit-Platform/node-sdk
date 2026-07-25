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

test('payout create sends the required idempotency key and payload', async () => {
  await withServer(
    (request, response) => {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/v1/payouts');
      assert.equal(request.headers['idempotency-key'], 'order-123');
      assert.equal(request.headers['x-org-id'], 'org_123');

      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        assert.deepEqual(JSON.parse(body), {
          connection_id: 'conn_123',
          amount: 2500,
          currency: 'GHS',
          beneficiary_id: 'ben_123',
        });
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ id: 'po_123' }));
      });
    },
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const payout = await client.payouts.create(
        {
          connection_id: 'conn_123',
          amount: 2500,
          currency: 'GHS',
          beneficiary_id: 'ben_123',
        },
        { idempotencyKey: 'order-123' },
      );
      assert.equal(payout.id, 'po_123');
    },
  );
});

test('payout create rejects a blank idempotency key before a request', async () => {
  const client = new Reevit('pfk_test_key', 'org_123', 'http://127.0.0.1:1');
  await assert.rejects(
    client.payouts.create(
      { connection_id: 'conn_123', amount: 2500, currency: 'GHS' },
      { idempotencyKey: '  ' },
    ),
    /idempotencyKey is required/,
  );
});
