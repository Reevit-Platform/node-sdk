// Exercise the archive npm will publish, not the source tree's dist folder.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'reevit-node-package-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--cache', join(dir, 'npm-cache'), '--ignore-scripts', '--json', '--pack-destination', dir], { encoding: 'utf8' }));
  const [archive] = Array.isArray(packed) ? packed : Object.values(packed);
  assert.ok(archive?.filename, 'npm pack did not report an archive');
  execFileSync('tar', ['-xzf', join(dir, archive.filename), '-C', dir]);
  symlinkSync(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
  const packagePath = join(dir, 'package', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const { Reevit, isReevitAPIError } = createRequire(packagePath)('./');
  let responseBody = { payments: [] };
  const seen = [];
  const policyWrites = [];
  const server = http.createServer(async (request, response) => {
    seen.push(request.headers);
    response.setHeader('content-type', 'application/json');
    if (request.method === 'POST' && request.url === '/v1/policies/fraud') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body);
      policyWrites.push({key: request.headers['idempotency-key'], payload});
      if (!request.headers['idempotency-key']) {
        response.writeHead(400);
        response.end(JSON.stringify({code: 'missing_idempotency_key', message: 'Idempotency-Key header is required'}));
      } else {
        response.writeHead(201);
        response.end(JSON.stringify(payload));
      }
      return;
    }
    response.end(JSON.stringify(responseBody));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const client = new Reevit('pfk_test_package', 'org_package', `http://127.0.0.1:${server.address().port}`);
    assert.deepEqual(await client.payments.list(), []);
    responseBody = { data: [{ id: 'pay_package' }] };
    assert.deepEqual(await client.payments.list(), [{ id: 'pay_package' }]);
    responseBody = { items: [{ id: 'pay_hidden' }] };
    await assert.rejects(client.payments.list(), (error) =>
      isReevitAPIError(error) && error.code === 'unexpected_response_shape');
    const policy = {max_amount: 5000, blocked_bins: ['400000'], allowed_bins: [], velocity_max_per_minute: 5};
    const options = {idempotencyKey: 'fraud-policy:packed-revision'};
    assert.deepEqual(await client.fraud.update({...policy, prefer: ['paystack']}, options), policy);
    assert.deepEqual(await client.fraud.update(policy, options), policy);
    assert.deepEqual(policyWrites, [{key: options.idempotencyKey, payload: policy}, {key: options.idempotencyKey, payload: policy}]);
    for (const headers of seen) {
      assert.equal(headers['x-reevit-client-version'], pkg.version);
      assert.equal(headers['user-agent'], `reevit-node/${pkg.version}`);
    }
    console.log(`Packed ${pkg.name}@${pkg.version}: version headers, list envelopes, malformed-response errors, and keyed fraud policy updates verified.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
