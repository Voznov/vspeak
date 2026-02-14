import { dash } from 'radash';
import { Api } from '../../libs/api';
import { type RpcOptions } from '../../libs/rpc.interface';

const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const api = new Proxy(new Api(), {
  get(_, methodName: string) {
    return async (payload: object, options?: RpcOptions) => {
      const uri = `/api/${dash(methodName)}`;
      const timeout = options?.timeoutMs ?? 30000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add Authorization header if token exists
        const token = getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(uri, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    };
  },
});
