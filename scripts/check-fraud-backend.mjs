// Isolated compatibility proof using the current backend's exact JSON decoder,
// policy request shape and initial operation-key guard. No database or PSP calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const backend = path.resolve(process.argv[2] || '');
const publicPackage = path.resolve(process.argv[3] || '');
assert.ok(process.argv[2] && process.argv[3], 'pass the verified backend source and public Node package root');
const proof = process.env.REEVIT_FRAUD_PROOF_DIR || mkdtempSync(path.join(tmpdir(), 'reevit-node-fraud-proof-'));
mkdirSync(proof, { recursive: true });

function declaration(source, prefix) {
  const start = source.indexOf(prefix);
  assert.ok(start >= 0, `backend declaration ${prefix}`);
  const opening = source.indexOf('{', start);
  let depth = 0;
  for (let index = opening; index < source.length; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('unterminated backend declaration');
}
const handlers = readFileSync(path.join(backend, 'adapters/http/handlers.go'), 'utf8');
const policies = readFileSync(path.join(backend, 'adapters/http/handlers_fraud_policy.go'), 'utf8');
const middleware = readFileSync(path.join(backend, 'adapters/http/middleware_idempotency.go'), 'utf8');
const decoder = declaration(handlers, 'func decodeJSON(');
const requestType = declaration(policies, 'type policyRequest struct');
const guard = middleware.slice(middleware.indexOf('\t\t\tkey := strings.TrimSpace'), middleware.indexOf('\t\t\tbody, err := io.ReadAll'));
assert.ok(guard.includes('missing_idempotency_key') && guard.includes('invalid_idempotency_key'));
const manifest = { backendCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: backend, encoding: 'utf8'}).trim(), copiedDeclarations: {} };
for (const [name, source] of Object.entries({decodeJSON: decoder, policyRequest: requestType, initialKeyGuard: guard})) {
  manifest.copiedDeclarations[name] = createHash('sha256').update(source).digest('hex');
}
writeFileSync(path.join(proof, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(path.join(proof, 'go.mod'), 'module example.com/reevit-node-fraud-fixture\n\ngo 1.23\n');
writeFileSync(path.join(proof, 'decoder.go'), `package main
import("encoding/json"; "errors"; "fmt"; "io"; "net"; "net/http"; "strings"; "unicode")
var ErrEmptyBody = errors.New("empty body")
${decoder}
${requestType}
func writeError(w http.ResponseWriter, status int, code, message string) {
 w.Header().Set("Content-Type", "application/json"); w.WriteHeader(status)
 _ = json.NewEncoder(w).Encode(map[string]string{"code":code,"message":message})
}
func main() {
 listener, err := net.Listen("tcp", "127.0.0.1:0"); if err != nil {panic(err)}
 fmt.Printf("http://%s\\n", listener.Addr())
 handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
${guard}
  var policy policyRequest
  if err := decodeJSON(r, &policy); err != nil {writeError(w,400,"invalid_request",err.Error());return}
  w.Header().Set("Content-Type", "application/json"); w.WriteHeader(201)
  _ = json.NewEncoder(w).Encode(policy)
 })
 if err := http.Serve(listener, handler); err != nil {panic(err)}
}
`);
const binary = path.join(proof, 'decoder-fixture');
execFileSync('go', ['build', '-o', binary, '.'], { cwd: proof, stdio: 'inherit' });
const server = spawn(binary, [], { cwd: proof, stdio: ['ignore', 'pipe', 'inherit'] });
try {
  const baseUrl = await new Promise((resolve, reject) => {
    server.stdout.once('data', data => resolve(data.toString().trim()));
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`decoder fixture exited ${code}`)));
  });
  const { Reevit: PublicReevit } = createRequire(path.join(publicPackage, 'package.json'))('./');
  assert.equal(JSON.parse(readFileSync(path.join(publicPackage, 'package.json'))).version, '0.10.2');
  const { Reevit } = createRequire(path.resolve('package.json'))('./dist/index.js');
  const old = new PublicReevit('pfk_test_fixture', 'org_fixture', baseUrl);
  const candidate = new Reevit('pfk_test_fixture', 'org_fixture', baseUrl);
  const body = {max_amount: 5000, blocked_bins: ['400000'], allowed_bins: [], velocity_max_per_minute: 5};
  const key = {idempotencyKey: 'fraud-policy:revision_2'};
  await assert.rejects(old.fraud.update(body, key), error => error.status === 400 && error.code === 'missing_idempotency_key');
  const unsupported = await fetch(`${baseUrl}/v1/policies/fraud`, {method: 'POST', headers: {'Content-Type':'application/json','Idempotency-Key':'legacy-policy'}, body: JSON.stringify({...body,prefer:['paystack']})});
  assert.equal(unsupported.status, 400, 'the exact closed backend decoder rejects legacy prefer');
  const first = await candidate.fraud.update({...body, prefer: ['paystack']}, key);
  const retry = await candidate.fraud.update(body, key);
  assert.deepEqual(first, body);
  assert.deepEqual(retry, body);
  writeFileSync(path.join(proof, 'evidence.json'), JSON.stringify({...manifest, publicVersion:'0.10.2', candidateVersion:JSON.parse(readFileSync('package.json')).version, publicWithOptionsStatus:400, unsupportedPreferStatus:400, candidateStatus:201, retryStatus:201, scope:'exact copied JSON decoder, policy shape and initial key guard; excludes persistence and PSP behavior'}, null, 2) + '\n');
  console.log(`Public Node 0.10.2 rejected (400); candidate guarded policy + retry accepted (201). Evidence: ${proof}`);
} finally {
  server.kill('SIGTERM');
}
