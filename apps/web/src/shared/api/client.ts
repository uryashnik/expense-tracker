import type { ApiError } from '@expense-tracker/shared';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3001/api';

/** Ошибка, приведённая к контракту ApiError из apps/api. */
export class ApiRequestError extends Error {
  constructor(readonly payload: ApiError) {
    super(payload.message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    // Для трекера расходов данные всегда актуальные; кэш включаем точечно там, где он нужен.
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(await toApiError(response, path));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function toApiError(response: Response, path: string): Promise<ApiError> {
  try {
    return (await response.json()) as ApiError;
  } catch {
    return {
      statusCode: response.status,
      message: response.statusText || 'Ошибка запроса к API',
      path,
      timestamp: new Date().toISOString(),
    };
  }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
