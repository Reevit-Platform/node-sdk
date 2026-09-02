import test from 'node:test';
import assert from 'node:assert/strict';

import { extractArray, extractPage, tryExtractArray } from '../dist/services/utils.js';
import { isReevitAPIError } from '../dist/index.js';

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

test('extractArray returns an empty array for a recognised-but-empty container', () => {
  assert.deepEqual(extractArray([], 'customers'), []);
  assert.deepEqual(extractArray({ customers: [] }, 'customers'), []);
  assert.deepEqual(extractArray({ data: [], pagination: { total: 0 } }, 'customers'), []);
  assert.deepEqual(extractArray({ data: { customers: [] } }, 'customers'), []);
});

test('extractArray returns an empty array for an absent body (204)', () => {
  assert.deepEqual(extractArray(null, 'customers'), []);
  assert.deepEqual(extractArray(undefined, 'customers'), []);
});

test('extractArray throws unexpected_response_shape when no container matches', () => {
  // The regression this guards: a third envelope ships and every list method
  // silently returns [], indistinguishable from "this merchant has none".
  assert.throws(
    () => extractArray({ pagination: { total: 0 } }, 'customers'),
    (error) => {
      assert.ok(isReevitAPIError(error), 'expected a ReevitAPIError');
      assert.equal(error.code, 'unexpected_response_shape');
      assert.equal(error.details.key, 'customers');
      assert.match(error.message, /pagination/);
      return true;
    },
  );

  assert.throws(
    () => extractArray({ items: [{ id: '1' }] }, 'customers'),
    (error) => isReevitAPIError(error) && error.code === 'unexpected_response_shape',
  );

  assert.throws(
    () => extractArray('not json', 'customers'),
    (error) => isReevitAPIError(error) && error.code === 'unexpected_response_shape',
  );
});

test('tryExtractArray returns null instead of throwing on a miss', () => {
  assert.equal(tryExtractArray({ pagination: { total: 0 } }, 'customers'), null);
  assert.deepEqual(tryExtractArray({ customers: [] }, 'customers'), []);
});

test('extractPage forwards total/limit/offset from a flat body', () => {
  const page = extractPage({ payouts: [{ id: 'po_1' }], total: 9, limit: 1, offset: 4 }, 'payouts');
  assert.deepEqual(page.items, [{ id: 'po_1' }]);
  assert.equal(page.total, 9);
  assert.equal(page.limit, 1);
  assert.equal(page.offset, 4);
});

test('extractPage forwards pagination from the data envelope', () => {
  const page = extractPage(
    { data: { payouts: [{ id: 'po_1' }] }, pagination: { total: 7, limit: 2, offset: 6 } },
    'payouts',
  );
  assert.deepEqual(page.items, [{ id: 'po_1' }]);
  assert.equal(page.total, 7);
  assert.equal(page.limit, 2);
  assert.equal(page.offset, 6);
});

test('extractPage falls back to the request options when pagination is absent', () => {
  const page = extractPage([{ id: 'po_1' }], 'payouts', { limit: 25, offset: 50 });
  assert.equal(page.total, 1);
  assert.equal(page.limit, 25);
  assert.equal(page.offset, 50);
});
