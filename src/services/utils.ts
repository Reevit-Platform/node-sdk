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
    const candidate = (data as Record<string, unknown>)[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}
