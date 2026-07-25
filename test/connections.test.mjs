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

test('connection credential test accepts the backend ok response', async () => {
  await withServer(
    (request, response) => {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/v1/connections/test');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ ok: true }));
    },
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const valid = await client.connections.test({
        provider: 'paystack',
        mode: 'sandbox',
        credentials: { secret_key: 'sk_test' },
      });
      assert.equal(valid, true);
    },
  );
});

test('listAll follows pagination and sends every connection filter', async () => {
  const seenOffsets = [];
  await withServer(
    (request, response) => {
      const url = new URL(request.url, 'http://localhost');
      assert.equal(request.method, 'GET');
      assert.equal(url.pathname, '/v1/connections');
      assert.equal(url.searchParams.get('provider'), 'paystack');
      assert.equal(url.searchParams.get('mode'), 'live');
      assert.equal(url.searchParams.get('status'), 'active');
      assert.equal(url.searchParams.get('label'), 'primary');
      assert.equal(url.searchParams.get('limit'), '200');
      assert.equal(request.headers['x-org-id'], 'org_123');

      const offset = Number(url.searchParams.get('offset'));
      seenOffsets.push(offset);
      const ids = offset === 0 ? ['conn_1', 'conn_2'] : ['conn_3'];
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          connections: ids.map((id) => ({
            id,
            provider: 'paystack',
            mode: 'live',
            status: 'active',
            labels: ['primary'],
            name_match_status: 'match',
          })),
          pagination: { total: 3, limit: 200, offset },
        }),
      );
    },
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      const connections = await client.connections.listAll({
        provider: 'paystack',
        mode: 'live',
        status: 'active',
        label: 'primary',
      });
      assert.deepEqual(connections.map(({ id }) => id), ['conn_1', 'conn_2', 'conn_3']);
      assert.equal(connections[0].name_match_status, 'match');
    },
  );
  assert.deepEqual(seenOffsets, [0, 2]);
});

test('list rejects a malformed wrapped response instead of reporting zero PSPs', async () => {
  await withServer(
    (_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ pagination: { total: 4, limit: 50, offset: 0 } }));
    },
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      await assert.rejects(client.connections.list(), /missing connections array/);
    },
  );
});

test('listLabels fetches merchant connection label statistics', async () => {
  await withServer(
    (request, response) => {
      assert.equal(request.url, '/v1/connections/labels');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify([{ label: 'primary', total: 2 }]));
    },
    async (baseUrl) => {
      const client = new Reevit('pfk_test_key', 'org_123', baseUrl);
      assert.deepEqual(await client.connections.listLabels(), [
        { label: 'primary', total: 2 },
      ]);
    },
  );
});
