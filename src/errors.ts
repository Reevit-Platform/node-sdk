export interface ReevitAPIErrorOptions {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  recoverable?: boolean;
  cause?: unknown;
}

export class ReevitAPIError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly recoverable: boolean;
  readonly cause?: unknown;

  constructor(message: string, options: ReevitAPIErrorOptions = {}) {
    super(message);
    this.name = 'ReevitAPIError';
    this.status = options.status;
    this.code = options.code || 'api_error';
    this.details = options.details;
    this.requestId = options.requestId;
    this.recoverable = options.recoverable ?? isRecoverableStatus(options.status);
    this.cause = options.cause;
  }
}

export function isReevitAPIError(error: unknown): error is ReevitAPIError {
  return error instanceof ReevitAPIError;
}

export function normalizeAxiosError(error: any): ReevitAPIError {
  if (isReevitAPIError(error)) {
    return error;
  }

  const response = error?.response;
  const data = response?.data && typeof response.data === 'object' ? response.data : {};
  const headers = response?.headers || {};
  const status = response?.status;
  const code = data.code || error?.code || (status ? 'api_error' : 'network_error');
  const message = data.message || error?.message || 'Reevit request failed';
  const requestId = headers['x-request-id'] || headers['x-reevit-request-id'];

  return new ReevitAPIError(message, {
    status,
    code,
    details: data.details,
    requestId,
    cause: error,
  });
}

function isRecoverableStatus(status?: number): boolean {
  return status === undefined || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
