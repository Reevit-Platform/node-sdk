import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { Reevit, isReevitAPIError } from '../dist/index.js';

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

function jsonServer(expectedPath, body) {
  return (request, response) => {
    assert.equal(request.url.split('?')[0], expectedPath);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(body));
  };
}

test('payouts.list reads the legacy flat shape', async () => {
  await withServer(
    jsonServer('/v1/payouts', {
      payouts: [{ id: 'po_1' }, { id: 'po_2' }],
      total: 12,
      limit: 2,
      offset: 4,
    }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const page = await client.payouts.list({ limit: 2, offset: 4 });
      assert.deepEqual(page.payouts, [{ id: 'po_1' }, { id: 'po_2' }]);
      assert.equal(page.total, 12);
      assert.equal(page.limit, 2);
      assert.equal(page.offset, 4);
    },
  );
});

test('payouts.list reads the { data, pagination } envelope', async () => {
  await withServer(
    jsonServer('/v1/payouts', {
      data: [{ id: 'po_1' }],
      pagination: { total: 3, limit: 1, offset: 2 },
    }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const page = await client.payouts.list({ limit: 1, offset: 2 });
      assert.deepEqual(page.payouts, [{ id: 'po_1' }]);
      assert.equal(page.total, 3);
      assert.equal(page.limit, 1);
      assert.equal(page.offset, 2);
    },
  );
});

test('payouts.balance reads both the legacy shape and the envelope', async () => {
  await withServer(
    jsonServer('/v1/payouts/balance', { balances: [{ currency: 'GHS', amount: 500 }] }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      assert.deepEqual(await client.payouts.balance('conn_1'), [
        { currency: 'GHS', amount: 500 },
      ]);
    },
  );

  await withServer(
    jsonServer('/v1/payouts/balance', { data: { balances: [{ currency: 'NGN', amount: 900 }] } }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      assert.deepEqual(await client.payouts.balance('conn_1'), [
        { currency: 'NGN', amount: 900 },
      ]);
    },
  );
});

test('payouts.balance raises rather than throwing a TypeError on an unknown shape', async () => {
  await withServer(jsonServer('/v1/payouts/balance', { wallets: [] }), async (baseUrl) => {
    const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
    await assert.rejects(client.payouts.balance('conn_1'), (error) => {
      assert.ok(isReevitAPIError(error), 'expected a ReevitAPIError');
      assert.equal(error.code, 'unexpected_response_shape');
      return true;
    });
  });
});

test('payouts.listBeneficiaries reads both shapes', async () => {
  await withServer(
    jsonServer('/v1/beneficiaries', {
      beneficiaries: [{ id: 'ben_1' }],
      total: 1,
      limit: 50,
      offset: 0,
    }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const page = await client.payouts.listBeneficiaries();
      assert.deepEqual(page.beneficiaries, [{ id: 'ben_1' }]);
      assert.equal(page.total, 1);
    },
  );

  await withServer(
    jsonServer('/v1/beneficiaries', {
      data: { beneficiaries: [{ id: 'ben_2' }] },
      pagination: { total: 5, limit: 10, offset: 0 },
    }),
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const page = await client.payouts.listBeneficiaries({ limit: 10 });
      assert.deepEqual(page.beneficiaries, [{ id: 'ben_2' }]);
      assert.equal(page.total, 5);
      assert.equal(page.limit, 10);
    },
  );
});
