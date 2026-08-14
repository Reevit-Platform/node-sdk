import { AxiosRequestConfig } from 'axios';
import { RequestOptions } from '../types';

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

export function extractArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    // The legacy flat key is checked before the generic "data" envelope so
    // that an already-shipped response like { customers: [...] } can never
    // be shadowed by a future { data: [...] } or { data: { customers: [...] } }
    // envelope — this is what makes adding envelope support a provable no-op.
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

  return [];
}
