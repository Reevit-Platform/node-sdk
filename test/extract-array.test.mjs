import test from 'node:test';
import assert from 'node:assert/strict';

import { extractArray } from '../dist/services/utils.js';

test('extractArray returns a bare array as-is (legacy)', () => {
  const items = [{ id: '1' }, { id: '2' }];
  assert.deepEqual(extractArray(items, 'customers'), items);
});

test('extractArray unwraps the legacy flat key', () => {
  const items = [{ id: '1' }];
  assert.deepEqual(extractArray({ customers: items }, 'customers'), items);
});

test('extractArray unwraps the new { data: [...] } envelope', () => {
  const items = [{ id: '1' }];
  assert.deepEqual(
    extractArray({ data: items, pagination: { total: 1 } }, 'customers'),
    items,
  );
});

test('extractArray unwraps the double-nested { data: { key: [...] } } envelope', () => {
  const items = [{ id: '1' }];
  assert.deepEqual(
    extractArray({ data: { logs: items }, pagination: { total: 1 } }, 'logs'),
    items,
  );
});

test('extractArray prefers the legacy flat key over the data envelope', () => {
  const legacyItems = [{ id: 'legacy' }];
  const envelopeItems = [{ id: 'envelope' }];
  assert.deepEqual(
    extractArray(
      { customers: legacyItems, data: envelopeItems },
      'customers',
    ),
    legacyItems,
  );
});

test('extractArray returns an empty array when nothing matches', () => {
  assert.deepEqual(extractArray({ pagination: { total: 0 } }, 'customers'), []);
  assert.deepEqual(extractArray(null, 'customers'), []);
  assert.deepEqual(extractArray(undefined, 'customers'), []);
});
