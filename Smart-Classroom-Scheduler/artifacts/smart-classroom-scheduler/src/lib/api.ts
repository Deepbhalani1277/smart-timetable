export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
const healthPath = import.meta.env.VITE_API_HEALTH_PATH || '/health';

type RequestOptions = Omit<RequestInit, 'body'> & { query?: Record<string, string | number | boolean | undefined>; body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${query.toString() ? `?${query}` : ''}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) },
    });
  } catch {
    throw new ApiError('The scheduling service is unreachable. Check that the API server is running.');
  }
  const text = await response.text();
  let payload: unknown;
  try { payload = text ? JSON.parse(text) : undefined; } catch { payload = text; }
  if (!response.ok) {
    const serverMessage = typeof payload === 'object' && payload !== null && 'message' in payload ? String((payload as { message: unknown }).message) : '';
    throw new ApiError(serverMessage || `The request could not be completed (${response.status}).`, response.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  getAll: async <T>(path: string, query: RequestOptions['query'] = {}) => {
    const results: T[] = [];
    const pageSize = 200;
    for (let page = 1; page <= 100; page += 1) {
      const payload = await request<unknown>(path, { method: 'GET', query: { ...query, page, limit: pageSize } });
      const batch = listFrom<T>(payload);
      results.push(...batch);
      const total = payload && typeof payload === 'object' && !Array.isArray(payload) && 'total' in payload
        ? Number((payload as { total: unknown }).total)
        : undefined;
      if (batch.length < pageSize || (total !== undefined && Number.isFinite(total) && results.length >= total)) break;
    }
    return results;
  },
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  health: () => request<unknown>(healthPath, { method: 'GET' }),
};

export function listFrom<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'records']) if (Array.isArray(value[key])) return value[key] as T[];
  }
  return [];
}

export function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}