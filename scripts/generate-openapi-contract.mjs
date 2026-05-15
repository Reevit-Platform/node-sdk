import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendSpec = resolve(root, '../../backend/internal/docs/openapi.yaml');
const snapshotSpec = resolve(root, 'openapi/reevit-openapi.yaml');

if (!existsSync(backendSpec)) {
  console.error(`Backend OpenAPI spec not found at ${backendSpec}`);
  process.exit(1);
}

mkdirSync(dirname(snapshotSpec), { recursive: true });
copyFileSync(backendSpec, snapshotSpec);
console.log(`Wrote ${snapshotSpec}`);
