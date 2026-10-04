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
  const [archive] = JSON.parse(execFileSync('npm', ['pack', '--cache', join(dir, 'npm-cache'), '--ignore-scripts', '--json', '--pack-destination', dir], { encoding: 'utf8' }));
  execFileSync('tar', ['-xzf', join(dir, archive.filename), '-C', dir]);
  symlinkSync(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
  const packagePath = join(dir, 'package', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const { Reevit, isReevitAPIError } = createRequire(packagePath)('./');
  let responseBody = { payments: [] };
  const seen = [];
  const server = http.createServer((request, response) => {
    seen.push(request.headers);
    response.setHeader('content-type', 'application/json');
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
    for (const headers of seen) {
      assert.equal(headers['x-reevit-client-version'], pkg.version);
      assert.equal(headers['user-agent'], `reevit-node/${pkg.version}`);
    }
    console.log(`Packed ${pkg.name}@${pkg.version}: version headers, list envelopes, and malformed-response errors verified.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
