import { AxiosRequestConfig } from 'axios';
import { ReevitAPIError } from '../errors';
import { PaginationOptions, RequestOptions } from '../types';

export function toRequestConfig(options?: RequestOptions): AxiosRequestConfig | undefined {
  if (!options?.idempotencyKey) {
    return undefined;
  }

  return {
    headers: {
      'Idempotency-Key': options.idempotencyKey,
    },
  };
}

/**
 * Resolves the item array out of a list response, tolerating every envelope
 * shape the API has shipped or announced.
 *
 * Resolution order: bare array -> legacy flat key -> `{ data: [...] }` ->
 * `{ data: { <key>: [...] } }`. The legacy flat key is checked before the
 * generic `data` envelope so that an already-shipped response like
 * `{ customers: [...] }` can never be shadowed by a future `{ data: [...] }`
 * envelope — this is what makes adding envelope support a provable no-op.
 *
 * An empty array is returned only when a recognised container is present and
 * genuinely empty (or the body is empty, as with a 204). A payload that
 * carries none of the recognised containers throws a `ReevitAPIError` with
 * code `unexpected_response_shape` rather than returning `[]`: a silent `[]`
 * on a shape the SDK does not understand is indistinguishable from "this
 * merchant has no records", which would make a reconciliation or dunning
 * sweep process nothing and report success.
 */
export function extractArray<T>(data: unknown, key: string): T[] {
  const items = tryExtractArray<T>(data, key);
  if (items) {
    return items;
  }

  throw unexpectedResponseShape(data, key);
}

/**
 * The non-throwing half of {@link extractArray}: returns `null` instead of
 * throwing when no recognised container is present.
 */
export function tryExtractArray<T>(data: unknown, key: string): T[] | null {
  if (Array.isArray(data)) {
    return data as T[];
  }

  // An absent body (204 No Content, or an empty response) is genuinely empty
  // rather than an unrecognised shape.
  if (data === null || data === undefined) {
    return [];
  }

  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;

    const legacy = record[key];
    if (Array.isArray(legacy)) {
      return legacy as T[];
    }

    const envelope = record['data'];
    if (Array.isArray(envelope)) {
      return envelope as T[];
    }

    if (envelope && typeof envelope === 'object') {
      const nested = (envelope as Record<string, unknown>)[key];
      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }
  }

  return null;
}

export function unexpectedResponseShape(data: unknown, key: string): ReevitAPIError {
  const shape =
    data && typeof data === 'object' && !Array.isArray(data)
      ? `object with keys [${Object.keys(data as Record<string, unknown>).join(', ')}]`
      : typeof data;

  return new ReevitAPIError(
    `unexpected response shape for "${key}": expected an array, { ${key}: [...] }, ` +
      `{ data: [...] } or { data: { ${key}: [...] } }, received ${shape}`,
    { code: 'unexpected_response_shape', status: 0, details: { key } },
  );
}

export interface ExtractedPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * {@link extractArray} plus the pagination triple, read from either the flat
 * body (`{ items, total, limit, offset }`) or the envelope's `pagination`
 * object. Falls back to the request's own limit/offset, mirroring
 * `ConnectionsService.parseListPage`.
 */
export function extractPage<T>(
  data: unknown,
  key: string,
  options: PaginationOptions = {},
): ExtractedPage<T> {
  const items = extractArray<T>(data, key);
  const record = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
  const nested = record['data'] && typeof record['data'] === 'object' && !Array.isArray(record['data'])
    ? (record['data'] as Record<string, unknown>)
    : {};
  const pagination = record['pagination'] && typeof record['pagination'] === 'object'
    ? (record['pagination'] as Record<string, unknown>)
    : nested['pagination'] && typeof nested['pagination'] === 'object'
      ? (nested['pagination'] as Record<string, unknown>)
      : {};

  const pick = (field: string): number | undefined => {
    for (const source of [pagination, record, nested]) {
      const value = Number(source[field]);
      if (source[field] !== undefined && source[field] !== null && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  };

  return {
    items,
    total: pick('total') ?? items.length,
    limit: pick('limit') ?? options.limit ?? items.length,
    offset: pick('offset') ?? options.offset ?? 0,
  };
}
