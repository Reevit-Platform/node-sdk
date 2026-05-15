import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotSpec = resolve(root, 'openapi/reevit-openapi.yaml');
const backendSpec = resolve(root, '../../backend/internal/docs/openapi.yaml');
const serviceFile = resolve(root, 'src/services/checkout-sessions.ts');

const specPath = existsSync(snapshotSpec) ? snapshotSpec : backendSpec;
const spec = readFileSync(specPath, 'utf8');
const service = readFileSync(serviceFile, 'utf8');

const requiredSpecFragments = [
  '/v1/checkout/sessions',
  '/v1/checkout/sessions/{session_secret}',
  'CheckoutSessionResponse',
];

const requiredServiceFragments = [
  'CheckoutSessionsService',
  "'/v1/checkout/sessions'",
  'CheckoutSessionRequest',
  'CheckoutSession',
];

const missingSpec = requiredSpecFragments.filter((fragment) => !spec.includes(fragment));
const missingService = requiredServiceFragments.filter((fragment) => !service.includes(fragment));

if (missingSpec.length || missingService.length) {
  console.error('Checkout session contract drift detected.');
  if (missingSpec.length) {
    console.error(`Missing from backend OpenAPI: ${missingSpec.join(', ')}`);
  }
  if (missingService.length) {
    console.error(`Missing from Node SDK service: ${missingService.join(', ')}`);
  }
  process.exit(1);
}

console.log('Checkout session contract guard passed.');
