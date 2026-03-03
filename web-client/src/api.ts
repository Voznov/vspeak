import { dash } from 'radash';
import { Api } from '../../libs/api';
import { type RpcOptions } from '../../libs/rpc.interface';

const TOKEN_KEY = 'auth_token';
const MIC_ENABLED_KEY = 'mic_enabled';
const DEAF_ENABLED_KEY = 'deaf_enabled';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getMicEnabled = (): boolean => localStorage.getItem(MIC_ENABLED_KEY) === 'true';

export const setMicEnabled = (enabled: boolean): void => {
  localStorage.setItem(MIC_ENABLED_KEY, enabled ? 'true' : 'false');
};

export const getDeafEnabled = (): boolean => localStorage.getItem(DEAF_ENABLED_KEY) === 'true';

export const setDeafEnabled = (enabled: boolean): void => {
  localStorage.setItem(DEAF_ENABLED_KEY, enabled ? 'true' : 'false');
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
          const body = await response.json().catch(() => null);
          if (typeof body === 'object' && body && 'errors' in body && Array.isArray(body.errors) && body.errors.length > 0) {
            throw new Error(`Error${body.errors.length > 1 ? 's' : ''}:\n${body.errors.join('\n')}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    };
  },
});
